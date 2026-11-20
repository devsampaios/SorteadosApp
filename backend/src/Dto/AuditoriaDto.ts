import type { Auditoria } from "@prisma/client";
import type { AuditoriaResponse } from "../Model/AuditoriaModel";
import { decifrar } from "../Helper/CampoCifrado";

type AuditoriaBuild = Auditoria & {
  rota: string | null;
  ip: string | null;
  usuario?: { nome: string | null; email: string } | null;
};

export function Build(auditoria: AuditoriaBuild): AuditoriaResponse {
  return {
    id: auditoria.id.toString(),
    rota: auditoria.rota ?? null,
    acao: auditoria.acao,
    situacao: auditoria.situacao,
    descricao: auditoria.descricao,
    ip: auditoria.ip ?? null,
    usuarioId: auditoria.usuarioId ? auditoria.usuarioId.toString() : null,
    usuarioNome: decifrar(auditoria.usuario?.nome) ?? auditoria.usuario?.email ?? null,
    criadoEm: auditoria.criadoEm.toISOString(),
  };
}
