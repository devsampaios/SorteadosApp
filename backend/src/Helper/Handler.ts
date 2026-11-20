import { Request, Response, NextFunction } from "express";
import { getContexto } from "../types/context";
import { withUnitOfWork } from "../Infra/UnitOfWork";

type Result<T> = T | { status: number; dados: T };

function respond(res: Response, result: unknown, defaultStatus: number): void {
  if (result && typeof result === "object" && "status" in result && "dados" in result) {
    const { status, dados } = result as { status: number; dados: unknown };
    res.status(status).json(dados);
    return;
  }
  res.status(defaultStatus).json(result);
}

export function Mutation<T>(
  table: string,
  action: string,
  fn: (req: Request) => Promise<Result<T>>,
  defaultStatus = 200,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    req.auditContext = { acao: action };
    try {
      const context = getContexto(req);
      const rota = `${req.method} ${req.path}`;
      const result = await withUnitOfWork(context, rota, table, action, () => fn(req));
      respond(res, result, defaultStatus);
    } catch (err) {
      next(err);
    }
  };
}

export function Query<T>(fn: (req: Request) => Promise<Result<T>>, defaultStatus = 200) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req);
      respond(res, result, defaultStatus);
    } catch (err) {
      next(err);
    }
  };
}
