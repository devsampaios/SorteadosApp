// Cálculo de fatura no cliente — espelho de backend/src/services/fatura.service.
// Usado só pra montar as opções e o auto-preenchimento do campo "Fatura
// destino"; a verdade continua sendo o backend, que recalcula ao salvar.

import { proximoDiaUtil } from "./diasUteis";

/** Último dia do mês, pra clampar (fechamento 31 em fevereiro vira 28). */
function diaClampado(ano: number, mes: number, dia: number): number {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return Math.min(dia, ultimo);
}

/** "2026-08" da fatura em que uma compra na data (AAAA-MM-DD) cairia. */
export function competenciaDaData(dataISO: string, diaFechamento: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const fechamento = diaClampado(ano, mes - 1, diaFechamento);
  // Até o fechamento entra na fatura deste mês; depois, na do mês seguinte.
  const alvo = dia <= fechamento ? new Date(ano, mes - 1, 1) : new Date(ano, mes, 1);
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}`;
}

/** Data de vencimento (Date) de uma competência, dado fechamento e vencimento. */
function vencimentoDaCompetencia(competencia: string, diaFechamento: number, diaVencimento: number): Date {
  const [ano, mes] = competencia.split("-").map(Number);
  // Vencimento depois do fechamento: se venc <= fech, cai no mês seguinte.
  const mesVenc = diaVencimento > diaFechamento ? mes - 1 : mes;
  const anoVenc = diaVencimento > diaFechamento ? ano : mes === 12 ? ano + 1 : ano;
  const mesNorm = ((mesVenc % 12) + 12) % 12;
  const bruto = new Date(anoVenc, mesNorm, diaClampado(anoVenc, mesNorm, diaVencimento));
  // Vencimento sempre em dia útil (espelha o backend).
  return proximoDiaUtil(bruto);
}

function deslocarCompetencia(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(ano, mes - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface OpcaoFatura {
  value: string; // competência "2026-08"
  label: string; // "Ago/2026 · vence 05/09"
}

/**
 * Opções de fatura ao redor da data da compra: da anterior até 3 à frente,
 * cada uma rotulada com o mês e a data de vencimento.
 */
export function opcoesFatura(dataISO: string, diaFechamento: number, diaVencimento: number): OpcaoFatura[] {
  const base = competenciaDaData(dataISO, diaFechamento);
  const opcoes: OpcaoFatura[] = [];
  for (let i = -1; i <= 3; i++) {
    const competencia = deslocarCompetencia(base, i);
    const [ano, mes] = competencia.split("-").map(Number);
    const mesRotulo = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
    const venc = vencimentoDaCompetencia(competencia, diaFechamento, diaVencimento);
    const vencRotulo = venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    opcoes.push({ value: competencia, label: `${mesRotulo.charAt(0).toUpperCase() + mesRotulo.slice(1)} · vence ${vencRotulo}` });
  }
  return opcoes;
}
