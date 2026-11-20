#!/usr/bin/env node
// Importa os resultados históricos de uma loteria a partir da planilha .xlsx
// (formato da Caixa: Concurso, Data, Bola1..N, Ganhadores/Rateio por faixa...).
//
//   npm run importar-sorteios -- "<arquivo.xlsx>" MEGA_SENA
//   npm run importar-sorteios -- "<arquivo.xlsx>" LOTOFACIL
//
// Pode ser rodado de novo: cada concurso é localizado por (loteria, número) e
// atualizado, com as dezenas e faixas de prêmio regravadas. Usa o banco do
// config.json.
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/Infra/Prisma";

// ----- Loterias suportadas (regras oficiais da Caixa) -----

interface RegraLoteria {
  nome: string;
  dezenasSorteadas: number;
  menorDezena: number;
  maiorDezena: number;
  minDezenasAposta: number;
  maxDezenasAposta: number;
}

const LOTERIAS: Record<string, RegraLoteria> = {
  MEGA_SENA: { nome: "Mega-Sena", dezenasSorteadas: 6, menorDezena: 1, maiorDezena: 60, minDezenasAposta: 6, maxDezenasAposta: 20 },
  LOTOFACIL: { nome: "Lotofácil", dezenasSorteadas: 15, menorDezena: 1, maiorDezena: 25, minDezenasAposta: 15, maxDezenasAposta: 20 },
};

// ----- Leitura do .xlsx (só a 1ª planilha; células em sequência) -----

function decodificarXml(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Converte "AB12" → índice da coluna (0 = A).
function indiceDaColuna(ref: string): number {
  const letras = ref.replace(/\d+/g, "");
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

async function lerPlanilha(arquivo: string): Promise<string[][]> {
  const zip = await JSZip.loadAsync(fs.readFileSync(arquivo));
  const xmlPlanilha = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
  if (!xmlPlanilha) throw new Error("Planilha xl/worksheets/sheet1.xml não encontrada no arquivo");

  const xmlStrings = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const compartilhadas = [...xmlStrings.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((si) =>
    decodificarXml([...si[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((t) => t[1]).join("")),
  );

  const linhas: string[][] = [];
  for (const linha of xmlPlanilha.matchAll(/<(?:\w+:)?row[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const celulas: string[] = [];
    for (const celula of linha[1].matchAll(/<(?:\w+:)?c(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const atributos = celula[1] ?? "";
      const conteudo = celula[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(atributos)?.[1];
      const tipo = /\bt="(\w+)"/.exec(atributos)?.[1];
      let valor = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(conteudo)?.[1] ?? "";
      if (tipo === "inlineStr") valor = /<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/.exec(conteudo)?.[1] ?? "";
      valor = tipo === "s" ? (compartilhadas[Number(valor)] ?? "") : decodificarXml(valor);
      // Célula com referência vai para a coluna certa; sem referência, segue a sequência.
      celulas[ref ? indiceDaColuna(ref) : celulas.length] = valor.trim();
    }
    linhas.push(Array.from(celulas, (c) => c ?? ""));
  }
  return linhas;
}

// ----- Conversão de valores -----

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function paraData(texto: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const data = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(data.getTime()) ? null : data;
}

// "R$1.234.567,89" → Decimal("1234567.89"); vazio → null.
function paraDinheiro(texto: string): Prisma.Decimal | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) throw new Error(`valor monetário inválido: "${texto}"`);
  return new Prisma.Decimal(limpo);
}

function paraInteiro(texto: string): number | null {
  if (!texto) return null;
  if (!/^\d+$/.test(texto)) throw new Error(`número inválido: "${texto}"`);
  return Number(texto);
}

// ----- Mapeamento do cabeçalho -----

interface Colunas {
  concurso: number;
  data: number;
  bolas: number[];
  ganhadores: Map<number, number>; // acertos → coluna
  rateio: Map<number, number>;
  acumulado?: number;
  arrecadacao?: number;
  estimativa?: number;
  acumuladoEspecial?: number;
  observacao?: number;
  cidade?: number;
}

function mapearColunas(cabecalho: string[]): Colunas {
  const colunas: Partial<Colunas> = { bolas: [], ganhadores: new Map(), rateio: new Map() };
  cabecalho.forEach((titulo, i) => {
    const t = normalizar(titulo);
    let m: RegExpExecArray | null;
    if (t === "concurso") colunas.concurso = i;
    else if (t.startsWith("data")) colunas.data = i;
    else if ((m = /^bola ?(\d+)$/.exec(t))) colunas.bolas![Number(m[1]) - 1] = i;
    else if ((m = /^ganhadores (\d+) acertos$/.exec(t))) colunas.ganhadores!.set(Number(m[1]), i);
    else if ((m = /^rateio (\d+) acertos$/.exec(t))) colunas.rateio!.set(Number(m[1]), i);
    else if (/^acumulado \d+ acertos$/.test(t)) colunas.acumulado = i;
    else if (t.startsWith("acumulado sorteio especial")) colunas.acumuladoEspecial = i;
    else if (t.startsWith("arrecadacao")) colunas.arrecadacao = i;
    else if (t.startsWith("estimativa")) colunas.estimativa = i;
    else if (t.startsWith("observacao")) colunas.observacao = i;
    else if (t.startsWith("cidade")) colunas.cidade = i;
  });
  if (colunas.concurso === undefined || colunas.data === undefined || colunas.bolas!.length === 0) {
    throw new Error(`Cabeçalho não reconhecido: ${cabecalho.join(" | ")}`);
  }
  return colunas as Colunas;
}

// ----- Montagem de um concurso -----

interface ConcursoLido {
  numero: number;
  dados: Omit<Prisma.ConcursoUncheckedCreateInput, "loteriaId" | "numero" | "dezenas" | "premiacoes">;
  dezenas: number[];
  premiacoes: { acertos: number; ganhadores: number; rateio: Prisma.Decimal; localGanhadores: string | null }[];
}

function lerConcurso(linha: string[], col: Colunas, regra: RegraLoteria): ConcursoLido {
  const valor = (i: number | undefined) => (i === undefined ? "" : (linha[i] ?? ""));

  const numero = paraInteiro(valor(col.concurso));
  if (!numero) throw new Error("número do concurso vazio");

  const data = paraData(valor(col.data));
  if (!data) throw new Error(`data inválida: "${valor(col.data)}"`);

  const dezenas = col.bolas.map((i) => paraInteiro(valor(i))).filter((d): d is number => d !== null);
  if (dezenas.length !== regra.dezenasSorteadas) {
    throw new Error(`esperadas ${regra.dezenasSorteadas} dezenas, encontradas ${dezenas.length}`);
  }
  const foraDaFaixa = dezenas.filter((d) => d < regra.menorDezena || d > regra.maiorDezena);
  if (foraDaFaixa.length) throw new Error(`dezenas fora da faixa: ${foraDaFaixa.join(", ")}`);
  if (new Set(dezenas).size !== dezenas.length) throw new Error(`dezenas repetidas: ${dezenas.join(", ")}`);

  const faixaPrincipal = Math.max(...col.ganhadores.keys());
  const cidade = valor(col.cidade);
  const premiacoes = [...col.ganhadores.entries()]
    .map(([acertos, i]) => ({
      acertos,
      ganhadores: paraInteiro(valor(i)) ?? 0,
      rateio: paraDinheiro(valor(col.rateio.get(acertos))) ?? new Prisma.Decimal(0),
      localGanhadores: acertos === faixaPrincipal && cidade && cidade !== "-" ? cidade : null,
    }))
    .sort((a, b) => b.acertos - a.acertos);

  return {
    numero,
    dados: {
      data,
      arrecadacaoTotal: paraDinheiro(valor(col.arrecadacao)),
      acumulado: paraDinheiro(valor(col.acumulado)),
      estimativaPremio: paraDinheiro(valor(col.estimativa)),
      acumuladoEspecial: paraDinheiro(valor(col.acumuladoEspecial)),
      observacao: valor(col.observacao) || null,
    },
    dezenas: [...dezenas].sort((a, b) => a - b),
    premiacoes,
  };
}

// ----- Execução -----

const TAMANHO_DO_LOTE = 200;

async function main(): Promise<void> {
  const [arquivoArg, codigoArg] = process.argv.slice(2);
  const codigo = (codigoArg ?? "").toUpperCase();
  const regra = LOTERIAS[codigo];
  if (!arquivoArg || !regra) {
    console.error(`Uso: npm run importar-sorteios -- "<arquivo.xlsx>" <${Object.keys(LOTERIAS).join("|")}>`);
    process.exit(1);
  }
  // npm run executa dentro de backend/; INIT_CWD é a pasta de onde o comando foi chamado.
  const arquivo = path.resolve(process.env.INIT_CWD ?? process.cwd(), arquivoArg);
  if (!fs.existsSync(arquivo)) {
    console.error(`Arquivo não encontrado: ${arquivo}`);
    process.exit(1);
  }

  const loteria = await prisma.loteria.upsert({
    where: { codigo },
    create: { codigo, ...regra },
    update: { ...regra },
  });

  const [cabecalho, ...linhas] = await lerPlanilha(arquivo);
  const colunas = mapearColunas(cabecalho);

  const concursos: ConcursoLido[] = [];
  const erros: string[] = [];
  linhas.forEach((linha, i) => {
    if (linha.every((c) => !c)) return;
    try {
      concursos.push(lerConcurso(linha, colunas, regra));
    } catch (err) {
      erros.push(`linha ${i + 2} (concurso ${linha[colunas.concurso] || "?"}): ${(err as Error).message}`);
    }
  });

  const vistos = new Set<number>();
  const unicos = concursos.filter((c) => {
    if (vistos.has(c.numero)) {
      erros.push(`concurso ${c.numero}: duplicado na planilha (mantida a primeira ocorrência)`);
      return false;
    }
    vistos.add(c.numero);
    return true;
  });

  const existentes = new Set(
    (await prisma.concurso.findMany({ where: { loteriaId: loteria.id }, select: { numero: true } })).map((c) => c.numero),
  );

  // Cada upsert regrava dezenas e prêmios; os lotes rodam em transação.
  for (let inicio = 0; inicio < unicos.length; inicio += TAMANHO_DO_LOTE) {
    const lote = unicos.slice(inicio, inicio + TAMANHO_DO_LOTE);
    await prisma.$transaction(
      lote.map((c) =>
        prisma.concurso.upsert({
          where: { loteriaId_numero: { loteriaId: loteria.id, numero: c.numero } },
          create: {
            loteriaId: loteria.id,
            numero: c.numero,
            ...c.dados,
            dezenas: { create: c.dezenas.map((dezena) => ({ dezena })) },
            premiacoes: { create: c.premiacoes },
          },
          update: {
            ...c.dados,
            dezenas: { deleteMany: {}, create: c.dezenas.map((dezena) => ({ dezena })) },
            premiacoes: { deleteMany: {}, create: c.premiacoes },
          },
        }),
      ),
    );
    process.stdout.write(`\r${Math.min(inicio + TAMANHO_DO_LOTE, unicos.length)}/${unicos.length} concursos gravados`);
  }
  process.stdout.write("\n");

  const inseridos = unicos.filter((c) => !existentes.has(c.numero)).length;
  console.log(`${loteria.nome}: ${inseridos} inseridos, ${unicos.length - inseridos} atualizados, ${erros.length} com erro.`);
  if (erros.length) {
    console.log("Linhas não importadas:");
    erros.forEach((e) => console.log(`  - ${e}`));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
