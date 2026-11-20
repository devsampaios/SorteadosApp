// Dias úteis no cliente — espelho de backend/src/services/dias-uteis.service.
// Só pra rotular a data de vencimento nas opções de "fatura destino"; a verdade
// é o backend. Opera em data local (como o resto de utils/fatura.ts).

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

const chave = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const somarDias = (base: Date, dias: number): Date => new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);

const cacheFeriados = new Map<number, Set<string>>();

function feriadosDoAno(ano: number): Set<string> {
  const cache = cacheFeriados.get(ano);
  if (cache) return cache;

  const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map(
    (md) => `${ano}-${md}`
  );
  const pascoa = calcularPascoa(ano);
  const moveis = [
    chave(somarDias(pascoa, -48)), // Carnaval (segunda)
    chave(somarDias(pascoa, -47)), // Carnaval (terça)
    chave(somarDias(pascoa, -2)), // Sexta-feira Santa
    chave(somarDias(pascoa, 60)), // Corpus Christi
  ];

  const set = new Set([...fixos, ...moveis]);
  cacheFeriados.set(ano, set);
  return set;
}

/** True se não é sábado, domingo nem feriado nacional. */
export function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !feriadosDoAno(data.getFullYear()).has(chave(data));
}

/** Primeiro dia útil a partir da data (inclusive). */
export function proximoDiaUtil(data: Date): Date {
  let d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  while (!ehDiaUtil(d)) d = somarDias(d, 1);
  return d;
}
