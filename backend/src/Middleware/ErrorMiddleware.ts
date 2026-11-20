import { Request, Response, NextFunction } from "express";
import { DomainError, NotFound, ValidationError } from "../Helper/AppError";
import { mapPrismaError } from "../Helper/MapearErroPrisma";
import { auditService } from "../services/audit.service";
import { clientIp } from "../Helper/clientIp";

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFound(`Rota não encontrada: ${req.method} ${req.path}`));
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const domain = err instanceof DomainError ? err : mapPrismaError(err);

  if (domain) {
    const body: Record<string, unknown> = { message: domain.message };
    if (domain instanceof ValidationError && domain.details) body.detalhes = domain.details;
    auditFailure(req, domain.statusCode, domain);
    res.status(domain.statusCode).json(body);
    return;
  }

  const legacy = err as ErrorWithStatus;
  const statusCode = typeof legacy?.statusCode === "number" ? legacy.statusCode : 500;
  const message = statusCode === 500 ? "Erro interno no servidor" : legacy.message;

  if (statusCode === 500) console.error("[ERROR]", err);
  auditFailure(req, statusCode, err);

  res.status(statusCode).json({ message });
}

function acaoPorStatus(statusCode: number): string {
  if (statusCode === 404) return "NÃO ENCONTRADO";
  if (statusCode === 401) return "NÃO AUTENTICADO";
  if (statusCode === 403) return "NÃO AUTORIZADO";
  return "ERRO";
}

function auditFailure(req: Request, statusCode: number, erro: unknown): void {
  const contexto = req.auditContext;
  const ip = clientIp(req);
  auditService.registrarFalha({
    usuarioId: req.contexto?.usuarioId ?? null,
    ip,
    acao: contexto?.acao ?? acaoPorStatus(statusCode),
    rota: `${req.method} ${req.path}`,
    statusCode,
    erro,
  });
}
