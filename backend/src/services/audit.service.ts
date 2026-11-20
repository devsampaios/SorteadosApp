import { prisma } from "../Infra/Prisma";
import { toId } from "../Helper/crypto";

export interface FalhaParams {
  usuarioId?: string | null;
  ip?: string | null;
  acao: string;
  rota: string;
  statusCode: number;
  erro: unknown;
}

function serializarErro(erro: unknown): string {
  if (erro instanceof Error) {
    const base: Record<string, unknown> = {
      name: erro.name,
      message: erro.message,
      stack: erro.stack,
    };
    for (const chave of Object.keys(erro)) {
      base[chave] = (erro as unknown as Record<string, unknown>)[chave];
    }
    return JSON.stringify(base, null, 2);
  }
  if (typeof erro === "string") {
    return erro;
  }
  try {
    return JSON.stringify(erro, null, 2);
  } catch {
    return String(erro);
  }
}

export const auditService = {
  registrarFalha(params: FalhaParams): void {
    const descricao = [`HTTP ${params.statusCode}`, serializarErro(params.erro)]
      .filter(Boolean)
      .join("\n\n");
    prisma.auditoria
      .create({
        data: {
          usuarioId: params.usuarioId ? toId(params.usuarioId) : null,
          rota: params.rota,
          acao: params.acao,
          situacao: "Exception",
          descricao,
          ip: params.ip,
        },
      })
      .catch((err: unknown) => {
        console.error("[audit] falha ao gravar erro:", err);
      });
  },
};
