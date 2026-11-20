import listaFeriados from './feriados.json';

// Feriados cadastrados em feriados.json. Aceita data recorrente "MM-DD" ou
// data específica de um ano "YYYY-MM-DD".
const FERIADOS = listaFeriados as { data: string; nome: string }[];

const pad = (n: number): string => String(n).padStart(2, '0');

// Domingo de Páscoa (algoritmo de Gauss / Anonymous Gregorian).
function domingoDePascoa(ano: number): Date {
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

function somarDias(data: Date, dias: number): Date {
	const nova = new Date(data);
	nova.setDate(nova.getDate() + dias);
	return nova;
}

function mesmoDia(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Feriados móveis derivados da Páscoa (calculados, não ficam no JSON).
function moveis(ano: number): { data: Date; nome: string }[] {
	const pascoa = domingoDePascoa(ano);
	return [
		{ data: somarDias(pascoa, -48), nome: 'Carnaval' },
		{ data: somarDias(pascoa, -47), nome: 'Carnaval' },
		{ data: somarDias(pascoa, -2), nome: 'Sexta-feira Santa' },
		{ data: somarDias(pascoa, 60), nome: 'Corpus Christi' },
	];
}

// Retorna o nome do feriado naquela data, ou null.
export function feriado(data: Date): string | null {
	const mmdd = `${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
	const yyyymmdd = `${data.getFullYear()}-${mmdd}`;
	const cadastrado = FERIADOS.find((f) => f.data === mmdd || f.data === yyyymmdd);
	if (cadastrado) {
		return cadastrado.nome;
	}
	for (const m of moveis(data.getFullYear())) {
		if (mesmoDia(m.data, data)) {
			return m.nome;
		}
	}
	return null;
}

export function ehFeriado(data: Date): boolean {
	return feriado(data) !== null;
}
