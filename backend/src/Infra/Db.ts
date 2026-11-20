import { AsyncLocalStorage } from "async_hooks";
import type { Prisma } from "@prisma/client";
import { prisma } from "./Prisma";

// Ambient client: either the current transaction's `tx` (inside a UnitOfWork)
// or the `prisma` singleton (outside any transaction). Repositories always call
// Db() and, without knowing it, join the request's transaction — no need to
// receive `tx` as a parameter.
type Client = Prisma.TransactionClient | typeof prisma;

const store = new AsyncLocalStorage<Client>();

export function withClient<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  return store.run(client, fn);
}

export function Db(): Client {
  return store.getStore() ?? prisma;
}
