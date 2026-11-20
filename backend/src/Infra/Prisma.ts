import { PrismaClient } from "@prisma/client";
import { config, buildDatabaseUrl } from "../config";

// Singleton de conexão. Mantém a decisão do projeto: a URL vem do config.json
// (buildDatabaseUrl), não de DATABASE_URL. Um único PrismaClient em todo o
// processo — nunca instanciar por requisição (esgota o pool).
//
// ⚠️ config.json pode apontar para produção. Rodar localmente exige apontar o
// database do config para um Postgres local (ver "passo 0" do plano).
export const prisma = new PrismaClient({
  datasourceUrl: buildDatabaseUrl(config.database),
  log: config.app.env === "development" ? ["query", "error"] : ["error"],
});
