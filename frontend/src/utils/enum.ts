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
