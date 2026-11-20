import type { Prisma, Auditoria } from "@prisma/client";
import type { IReadOnlyRepository } from "../Repository/Contracts";
import type { PageOptions, Page } from "../Helper/Paginar";

export interface FiltroAuditoria extends PageOptions {
  situacao?: string;
  acao?: string;
  rota?: string;
  /** Parte do login do usuário. */
  usuario?: string;
  /** Instante inicial (ISO), inclusivo. O front manda o início do dia local. */
  dataInicio?: Date;
  /** Instante final (ISO), inclusivo. O front manda o fim do dia local. */
  dataFim?: Date;
}

export type AuditoriaComUsuario = Prisma.AuditoriaGetPayload<{
  include: { usuario: { select: { id: true; nome: true; login: true } } };
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
