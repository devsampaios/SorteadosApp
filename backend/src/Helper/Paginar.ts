// Page contract consumed by the frontend: { items, count, pageSize }.
export interface Page<T> {
  items: T[];
  count: number;
  pageSize: number;
}

export interface PageOptions {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 200;

// Normalizes page/pageSize from the query into safe skip/take for Prisma.
export function toSkipTake(options: PageOptions): { skip: number; take: number; pageSize: number } {
  const pageSize = Math.min(Math.max(Number(options.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(options.page) || 1, 1);
  return { skip: (page - 1) * pageSize, take: pageSize, pageSize };
}

export function buildPage<T>(items: T[], count: number, pageSize: number): Page<T> {
  return { items, count, pageSize };
}
