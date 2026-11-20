import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../Infra/Prisma";
import { Unauthorized, Forbidden } from "../Helper/AppError";
import { clientIp } from "../Helper/clientIp";

const SESSION_TTL = "7d";
const MASTER_PROFILE = 1;
const ACTIVE_STATUS = 1;

// JWT payload shape (contract of signToken): keeps usuarioId/perfil keys.
interface SessionToken {
  usuarioId: string | number;
}

export function signToken(payload: { usuarioId: string; perfil: number }): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: SESSION_TTL });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    next(new Unauthorized("Token não fornecido"));
    return;
  }

  let userId: bigint;
  try {
    const payload = jwt.verify(header.slice(7).trim(), config.jwt.secret) as SessionToken;
    if (payload?.usuarioId === undefined || payload.usuarioId === null) throw new Error("payload sem usuarioId");
    userId = BigInt(payload.usuarioId);
  } catch {
    next(new Unauthorized("Token inválido"));
    return;
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, perfil: true, situacao: true },
    });

    if (!user) {
      next(new Unauthorized("Sessão inválida"));
      return;
    }
    if ((user.situacao ?? ACTIVE_STATUS) !== ACTIVE_STATUS) {
      next(new Forbidden("Usuário sem acesso"));
      return;
    }

    req.contexto = {
      usuarioId: user.id.toString(),
      perfil: user.perfil ?? 2,
      ip: clientIp(req),
      userAgent: req.headers["user-agent"] ?? "",
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireMaster(req: Request, _res: Response, next: NextFunction): void {
  if (req.contexto?.perfil !== MASTER_PROFILE) {
    next(new Forbidden("Acesso restrito a administradores"));
    return;
  }
  next();
}
