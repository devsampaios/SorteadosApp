import type { Prisma, Auditoria } from "@prisma/client";
import type { IReadOnlyRepository } from "../Repository/Contracts";
import type { PageOptions, Page } from "../Helper/Paginar";

export interface FiltroAuditoria extends PageOptions {
  situacao?: string;
}

export type AuditoriaComUsuario = Prisma.AuditoriaGetPayload<{
  include: { usuario: { select: { id: true; nome: true; email: true } } };
}>;

export interface AuditoriaResponse {
  id: string;
  rota: string | null;
  acao: string;
  situacao: string;
  descricao: string;
  ip: string | null;
  usuarioId: string | null;
  usuarioNome: string | null;
  criadoEm: string;
}

export interface IAuditoriaRepository extends IReadOnlyRepository<Auditoria> {
  ListarPorFiltro(filtro: FiltroAuditoria): Promise<Page<AuditoriaComUsuario>>;
}
