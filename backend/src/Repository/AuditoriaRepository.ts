import type { Auditoria, Prisma } from "@prisma/client";
import { ReadOnlyRepository } from "./BaseRepository";
import { toSkipTake, type Page } from "../Helper/Paginar";
import type { ReadDelegate } from "./Contracts";
import type { AuditoriaComUsuario, FiltroAuditoria, IAuditoriaRepository } from "../Model/AuditoriaModel";

export class AuditoriaRepository extends ReadOnlyRepository<Auditoria> implements IAuditoriaRepository {
  protected delegate(): ReadDelegate<Auditoria> {
    return this.db.auditoria as unknown as ReadDelegate<Auditoria>;
  }

  async ListarPorFiltro(filtro: FiltroAuditoria): Promise<Page<AuditoriaComUsuario>> {
    const { skip, take, pageSize } = toSkipTake(filtro);
    const where = this.montarWhere(filtro);
    const include = { usuario: { select: { id: true, nome: true, login: true } } };
    const [items, count] = await Promise.all([
      this.db.auditoria.findMany({ where, skip, take, orderBy: { id: "desc" }, include }),
      this.db.auditoria.count({ where }),
    ]);
    return { items, count, pageSize };
  }

  private montarWhere(filtro: FiltroAuditoria): Prisma.AuditoriaWhereInput {
    const where: Prisma.AuditoriaWhereInput = {};
    if (filtro.situacao) where.situacao = filtro.situacao;
    if (filtro.acao) where.acao = filtro.acao;
    if (filtro.rota) where.rota = { contains: filtro.rota, mode: "insensitive" };
    if (filtro.usuario) where.usuario = { login: { contains: filtro.usuario, mode: "insensitive" } };
    if (filtro.dataInicio || filtro.dataFim) {
      where.criadoEm = { gte: filtro.dataInicio, lte: filtro.dataFim };
    }
    return where;
  }
}
