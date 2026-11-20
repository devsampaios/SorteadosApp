import { prisma } from "./Prisma";
import { withClient } from "./Db";
import type { Contexto } from "../types/context";

export async function withUnitOfWork<T>(
  context: Contexto,
  rota: string,
  table: string,
  action: string,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const value = await withClient(tx, fn);
    await tx.auditoria.create({
      data: {
        usuarioId: BigInt(context.usuarioId),
        rota,
        acao: action,
        situacao: "Success",
        descricao: `OK ${action} ${table}`,
        ip: context.ip || null,
      },
    });
    return value;
  });
}
