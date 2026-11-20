import { Prisma } from "@prisma/client";
import type { Disciplina, DisciplinaUsuario, DisciplinaHorario, Avaliacao, NotaAvaliacao, Presenca } from "@prisma/client";
import type { IEntityRepository } from "../Repository/Contracts";
import type { EnumMap, EnumItem } from "../Helper/Enum";
import type { PageOptions, Page } from "../Helper/Paginar";

export const DiaSemana: EnumMap = {
  1: "SEGUNDA",
  2: "TERCA",
  3: "QUARTA",
  4: "QUINTA",
  5: "SEXTA",
  6: "SABADO",
};

// Papel do usuário na disciplina.
export const PapelDisciplina: EnumMap = { 1: "DONO", 2: "MEMBRO" };
export const PAPEL_DONO = 1;
export const PAPEL_MEMBRO = 2;

// Situação do vínculo usuário↔disciplina (participação/solicitação).
export const SituacaoMembro: EnumMap = { 1: "APROVADO", 2: "PENDENTE" };
export const MEMBRO_APROVADO = 1;
export const MEMBRO_PENDENTE = 2;

// Avaliação com a(s) nota(s) do usuário logado já embutida(s) — a query filtra
// `notas` por usuarioId, então a lista tem no máximo um item (a nota dele).
export type AvaliacaoComNota = Avaliacao & { notas: NotaAvaliacao[] };

// Avaliação acompanhada da disciplina e da nota do usuário — usada na tela de
// avaliações.
export type AvaliacaoComContexto = AvaliacaoComNota & {
  disciplina: { id: bigint; nome: string };
};

// Disciplina com a árvore (horários, avaliações com a nota do usuário e
// presenças do usuário) e o vínculo do usuário logado (para saber papel).
export type DisciplinaComArvore = Disciplina & {
  horarios: DisciplinaHorario[];
  avaliacoes: AvaliacaoComNota[];
  presencas: Presenca[];
  disciplinaUsuarios: DisciplinaUsuario[];
};

export interface CriarHorario {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
}

// Definição da avaliação (a nota é lançada por cada usuário à parte).
export interface CriarAvaliacao {
  nome: string;
  data?: Date;
  pontuacaoMaxima: number;
}

// Lançamento da nota do próprio usuário para uma avaliação.
export interface DefinirNota {
  pontuacaoObtida: number;
}

// Tópico da aula (compartilhado) e presença (individual), por disciplina + data.
export interface DefinirTopico {
  data: Date;
  topico: string;
}
export interface DefinirPresenca {
  data: Date;
  presente: boolean;
}
export interface AulasDaDisciplina {
  topicos: { data: Date; topico: string }[];
  presencas: Date[];
}
export interface AulasDaDisciplinaResponse {
  topicos: { data: string; topico: string }[];
  presencas: string[];
}

export interface CriarDisciplina {
  nome: string;
  professor?: string;
  sala?: string;
  cargaHoraria?: number;
  dataInicio?: Date;
  dataFim?: Date;
  horarios?: CriarHorario[];
  avaliacoes?: CriarAvaliacao[];
}

// Edição da disciplina: metadados + horários. As avaliações NÃO são reescritas
// aqui (têm endpoints próprios e carregam as notas dos membros).
export interface AtualizarDisciplina {
  nome?: string;
  professor?: string;
  sala?: string;
  cargaHoraria?: number;
  dataInicio?: Date;
  dataFim?: Date;
  horarios?: CriarHorario[];
}

export interface HorarioResponse {
  id: string;
  diaSemana: EnumItem | null;
  horaInicio: string;
  horaFim: string;
}

// Avaliação dentro da árvore da disciplina: definição + a nota do usuário logado.
export interface AvaliacaoResponse {
  id: string;
  nome: string;
  data: string | null;
  pontuacaoMaxima: number;
  minhaNota: number | null;
}

// Avaliação na tela de avaliações: inclui a disciplina a que pertence.
export interface AvaliacaoComContextoResponse extends AvaliacaoResponse {
  disciplinaId: string;
  disciplinaNome: string;
}

// Disciplina (recurso de topo): metadados + árvore + papel do usuário logado e
// quantas solicitações estão pendentes (só faz sentido para o dono).
export interface DisciplinaResponse {
  id: string;
  codigo: string | null;
  nome: string;
  professor: string | null;
  sala: string | null;
  cargaHoraria: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  pontuacaoAtual: number;
  qtdPresencas: number;
  horarios: HorarioResponse[];
  avaliacoes: AvaliacaoResponse[];
  papelDoUsuario: EnumItem | null;
  qtdSolicitacoesPendentes: number;
}

// Dados do solicitante/membro (join manual em `usuario` — referência solta).
export interface DadosUsuarioDisciplina {
  usuarioId: bigint;
  papel: number;
  situacao: number;
  criadoEm: Date;
  nome: string | null;
  email: string;
}

export interface MembroResponse {
  usuarioId: string;
  nome: string | null;
  email: string;
  papel: EnumItem | null;
  situacao: EnumItem | null;
  criadoEm: string;
}

// Disciplina no formato resumido, embutida na resposta de usuário (as
// disciplinas do aluno). Mais leve que DisciplinaResponse — sem árvore.
export interface DisciplinaResumo {
  id: string;
  codigo: string | null;
  nome: string;
  professor: string | null;
  sala: string | null;
  cargaHoraria: number | null;
}

// Disciplina informada inline no payload de usuário (criar/sincronizar). Com
// `id` atualiza a existente; sem `id` cria uma nova (com o usuário como dono).
export interface CriarDisciplinaUsuario {
  id?: string;
  nome: string;
  professor?: string;
  sala?: string;
  cargaHoraria?: number;
}

export interface IDisciplinaRepository
  extends IEntityRepository<Disciplina, Prisma.DisciplinaUncheckedCreateInput, Prisma.DisciplinaUncheckedUpdateInput> {
  ListarPorUsuario(usuarioId: bigint, opcoes: PageOptions): Promise<Page<DisciplinaComArvore>>;
  // A árvore embute a nota do próprio usuário (filtrada por usuarioId).
  PorIdComArvore(id: bigint, usuarioId: bigint): Promise<DisciplinaComArvore | null>;
  CriarComArvore(usuarioId: bigint, dados: CriarDisciplina): Promise<DisciplinaComArvore>;
  AtualizarComArvore(id: bigint, usuarioId: bigint, dados: AtualizarDisciplina): Promise<DisciplinaComArvore>;
  // Acesso / participação.
  Vinculo(disciplinaId: bigint, usuarioId: bigint): Promise<DisciplinaUsuario | null>;
  PorCodigo(codigo: string): Promise<Disciplina | null>;
  Solicitar(disciplinaId: bigint, usuarioId: bigint): Promise<void>;
  Aprovar(disciplinaId: bigint, usuarioId: bigint): Promise<void>;
  RemoverVinculo(disciplinaId: bigint, usuarioId: bigint): Promise<void>;
  ContarPendentes(disciplinaId: bigint): Promise<number>;
  ListarMembros(disciplinaId: bigint): Promise<DadosUsuarioDisciplina[]>;
  // Avaliações. As que recebem disciplinaId validam que a avaliação pertence à
  // disciplina; retornam null/false caso contrário.
  CriarAvaliacao(disciplinaId: bigint, usuarioId: bigint, dados: CriarAvaliacao): Promise<AvaliacaoComContexto>;
  AtualizarAvaliacao(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint, dados: CriarAvaliacao): Promise<AvaliacaoComContexto | null>;
  ExcluirAvaliacao(disciplinaId: bigint, avaliacaoId: bigint): Promise<boolean>;
  // Nota do próprio usuário (upsert / remoção).
  DefinirNota(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint, dados: DefinirNota): Promise<boolean>;
  RemoverNota(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint): Promise<boolean>;
  // Aulas: tópicos (compartilhados) + presenças do usuário.
  AulasDaDisciplina(disciplinaId: bigint, usuarioId: bigint): Promise<AulasDaDisciplina>;
  DefinirTopico(disciplinaId: bigint, data: Date, topico: string): Promise<void>;
  DefinirPresenca(disciplinaId: bigint, usuarioId: bigint, data: Date, presente: boolean): Promise<void>;
}
