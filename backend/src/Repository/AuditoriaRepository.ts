import type { Auditoria } from "@prisma/client";
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
    const where = filtro.situacao ? { situacao: filtro.situacao } : {};
    const include = { usuario: { select: { id: true, nome: true, login: true } } };
    const [items, count] = await Promise.all([
      this.db.auditoria.findMany({ where, skip, take, orderBy: { id: "desc" }, include }),
      this.db.auditoria.count({ where }),
    ]);
    return { items, count, pageSize };
  }
}
