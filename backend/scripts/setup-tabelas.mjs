#!/usr/bin/env node
// Sincroniza as tabelas do banco com prisma/schema.prisma (`prisma db push`).
// Usa host/porta/usuário/banco do config.json, mas pergunta a senha do banco
// no terminal — ela não fica gravada em lugar nenhum. Não usa .env: a
// DATABASE_URL só existe na memória do processo do Prisma CLI.
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const raiz = path.resolve(__dirname, "..");

const configJson = require(path.resolve(raiz, "config.json"));

// Lê a senha do terminal mostrando os caracteres digitados, pra dar pra
// acompanhar o que foi digitado.
function perguntarSenha(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pergunta, (senha) => {
      rl.close();
      resolve(senha);
    });
  });
}

async function main() {
  const { host, port, user, database } = configJson.database;
  const senha = await perguntarSenha("Senha do banco: ");

  const databaseUrl = `postgresql://${user}:${encodeURIComponent(senha)}@${host}:${port}/${database}`;

  const prismaBin = path.resolve(raiz, "node_modules/.bin/prisma");
  const resultado = spawnSync(prismaBin, ["db", "push"], {
    cwd: raiz,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  if (resultado.error) {
    console.error(resultado.error);
    process.exit(1);
  }
  process.exit(resultado.status ?? 1);
}

main();
