export function generateUUID(): string {
  return crypto.randomUUID();
}

export function isNumeric(value: string): boolean {
  return !isNaN(Number(value)) && value.trim() !== "";
}

export function buildQueryString(
  pageSize: number | null | undefined,
  skip: string | null | undefined,
  orderBy: string | null | undefined,
  filtro: Record<string, unknown> | null | undefined
): string {
  const params: string[] = [];
  if (pageSize != null) params.push(`pageSize=${pageSize}`);
  if (skip != null) params.push(`skip=${skip}`);
  if (orderBy) params.push(`orderBy=${encodeURIComponent(orderBy)}`);
  if (filtro) {
    for (const [k, v] of Object.entries(filtro)) {
      if (v != null && v !== "") {
        params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
  }
  return params.length ? `?${params.join("&")}` : "";
}

export function isAsyncFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
  return typeof fn === "function" && fn.constructor.name === "AsyncFunction";
}
