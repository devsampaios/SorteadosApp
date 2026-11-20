export interface ItemEnum {
	id: number;
	descricao: string;
}

export interface ItemEnumComCurto extends ItemEnum {
	curto: string;
}

export const DIAS_SEMANA: ItemEnumComCurto[] = [
	{ id: 1, descricao: 'SEGUNDA', curto: 'SEG' },
	{ id: 2, descricao: 'TERCA', curto: 'TER' },
	{ id: 3, descricao: 'QUARTA', curto: 'QUA' },
	{ id: 4, descricao: 'QUINTA', curto: 'QUI' },
	{ id: 5, descricao: 'SEXTA', curto: 'SEX' },
	{ id: 6, descricao: 'SABADO', curto: 'SÁB' },
];

export const SITUACOES_USUARIO: ItemEnum[] = [
	{ id: 1, descricao: 'ATIVO' },
	{ id: 2, descricao: 'BLOQUEADO' },
	{ id: 3, descricao: 'EXCLUIDO' },
];

export const PERFIS: ItemEnum[] = [
	{ id: 1, descricao: 'MASTER' },
	{ id: 2, descricao: 'USUARIO' },
];

export const PAPEIS_DISCIPLINA: ItemEnum[] = [
	{ id: 1, descricao: 'DONO' },
	{ id: 2, descricao: 'MEMBRO' },
];

export const SITUACOES_MEMBRO: ItemEnum[] = [
	{ id: 1, descricao: 'APROVADO' },
	{ id: 2, descricao: 'PENDENTE' },
];

// Carga horária da disciplina (em horas). Cada aula = 2h, então o total de
// aulas é carga / 2 (ex.: 30h → 15 aulas).
export const CARGAS_HORARIAS: ItemEnum[] = [
	{ id: 30, descricao: '30h' },
	{ id: 45, descricao: '45h' },
	{ id: 60, descricao: '60h' },
	{ id: 75, descricao: '75h' },
	{ id: 90, descricao: '90h' },
	{ id: 120, descricao: '120h' },
	{ id: 150, descricao: '150h' },
	{ id: 180, descricao: '180h' },
];

export function aulasDaCarga(cargaHoraria: number | null | undefined): number {
	return cargaHoraria ? Math.round(cargaHoraria / 2) : 0;
}

export const PAPEL_DISCIPLINA_DONO = 1;
export const SITUACAO_MEMBRO_PENDENTE = 2;

export function enumId(valor: unknown): number | undefined {
	if (valor == null || valor === '') {
		return undefined;
	}
	if (typeof valor === 'object') {
		return (valor as ItemEnum).id;
	}
	return Number(valor);
}

export function enumDescricao(valor: unknown, fallback = '—'): string {
	if (valor && typeof valor === 'object') {
		return (valor as ItemEnum).descricao ?? fallback;
	}
	return fallback;
}

export function descricaoPorId(lista: ItemEnum[], id: number | null | undefined, fallback = '—'): string {
	const item = lista.find((atual) => atual.id === id);
	return item ? item.descricao : fallback;
}

export function diaSemanaCurto(id: number | null | undefined, fallback = '—'): string {
	const item = DIAS_SEMANA.find((atual) => atual.id === id);
	return item ? item.curto : fallback;
}

export function opcoesDeEnum(lista: ItemEnum[]): { value: string; label: string }[] {
	return lista.map((item) => ({ value: String(item.id), label: item.descricao }));
}
