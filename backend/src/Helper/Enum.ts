export type EnumMap = Record<number, string>;
export interface EnumItem {
  id: number;
  descricao: string;
}

export function validIds(map: EnumMap): number[] {
  return Object.keys(map).map(Number);
}

export function descriptionOf(map: EnumMap, id: number | null | undefined): string | null {
  if (id == null) return null;
  return map[id] ?? null;
}


export function describe(map: EnumMap, id: number | null | undefined): EnumItem | null {
  const description = descriptionOf(map, id);
  return description == null ? null : { id: id as number, descricao: description };
}
