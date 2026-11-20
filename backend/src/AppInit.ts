import express, { Express, Request, Response, NextFunction } from "express";
import { config } from "./config";
import { prisma } from "./Infra/Prisma";
import { corsMiddleware } from "./Middleware/cors";
import { globalRateLimit } from "./Middleware/RateLimit";
import { errorMiddleware, notFoundMiddleware } from "./Middleware/ErrorMiddleware";
import { registrarRotas } from "./AppRoutes";
import { clientIp } from "./Helper/clientIp";

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  console.log(`[IP] ${clientIp(req)} -> ${req.method} ${req.path}`);
  res.on("finish", () => {
    console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

// Monta o Express: middlewares base → rate limit → rotas → not-found →
// tratamento de erro centralizado (sempre por último).
export function buildApp(): Express {
  const app = express();

  // Necessário para o rate limit enxergar o IP real atrás de proxy/LB.
  app.set("trust proxy", 1);

  app.use(corsMiddleware);
  app.options("*", corsMiddleware);

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(globalRateLimit);
  app.use(requestLogger);

  registrarRotas(app);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

async function main(): Promise<void> {
  await prisma.$connect();
  console.log("[DB] conexão estabelecida");

  const app = buildApp();
  app.listen(config.app.port, () => {
    console.log(`[API] http://0.0.0.0:${config.app.port} (${config.app.env})`);
  });
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
