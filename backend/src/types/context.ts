import { Request } from "express";


export interface Contexto {
  usuarioId: string;
  ip: string;
  userAgent: string;
}

export interface AuditContext {
  acao: string;
}

declare global {
  namespace Express {
    interface Request {
      contexto?: Contexto;
      auditContext?: AuditContext;
    }
  }
}

export function getContexto(req: Request): Contexto {
  if (!req.contexto) {
    throw new Error("Contexto ausente — rota não passou pelo middleware de autenticação");
  }
  return req.contexto;
}
