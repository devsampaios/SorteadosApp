import type { Request } from "express";

function primeiroHeader(valor: string | string[] | undefined): string | null {
  if (!valor) return null;
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  const primeiro = bruto.split(",")[0]?.trim();
  return primeiro || null;
}

// IP real do cliente atrás de proxy (nginx): usa x-real-ip, depois o primeiro
// endereço de x-forwarded-for, e só então cai no IP da conexão (o do proxy).
export function clientIp(req: Request): string {
  return (
    primeiroHeader(req.headers["x-real-ip"]) ??
    req.ip ??
    req.socket.remoteAddress ??
    ""
  );
}
