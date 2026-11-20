#!/usr/bin/env node
// Publica o build do site no ambiente de HOMOLOGAÇÃO. Só pede a senha SSH —
// o resto é fixo aqui embaixo.
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import SftpClient from "ssh2-sftp-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, "..");

/* ====================  DEFINIR OS PARÂMETROS AQUI ========================= */
const servidor = "18.231.6.210";
const usuario = "learning";
const caminhoLocal = path.resolve(__dirname, "../dist");
const caminhoRemoto = "/opt/app/learning/site";
/* ========================================================================== */

const LINHA = "==========================================================================";
const VERDE = "\x1b[32m";
const RESET = "\x1b[0m";

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

function executarComando(sftp, comando) {
  return new Promise((resolve, reject) => {
    console.log(`${VERDE}${usuario}@${servidor}$ ${comando}${RESET}`);
    sftp.client.exec(comando, (err, stream) => {
      if (err) return reject(err);
      let saida = "";
      stream.on("data", (chunk) => {
        saida += chunk.toString();
        process.stdout.write(`${VERDE}${chunk}${RESET}`);
      });
      stream.stderr.on("data", (chunk) => {
        saida += chunk.toString();
        process.stderr.write(`${VERDE}${chunk}${RESET}`);
      });
      stream.on("close", (codigo) => resolve({ codigo, saida }));
    });
  });
}

async function main() {
  console.log(LINHA);
  console.log("Publicação WEB para o ambiente de HOMOLOGAÇÃO");
  console.log(LINHA);
  console.log("Build...");
  const build = spawnSync("npm", ["run", "build"], { cwd: raiz, stdio: "inherit" });
  if (build.status !== 0) {
    console.error("Build falhou — corrija os erros acima antes de publicar.");
    process.exitCode = 1;
    return;
  }

  console.log(LINHA);
  console.log(`Usuário: ${usuario}`);
  const senha = await perguntarSenha("Senha: ");

  console.log();
  console.log(`Servidor: ${servidor}`);
  console.log();

  const sftp = new SftpClient();
  try {
    await sftp.connect({ host: servidor, port: 22, username: usuario, password: senha, readyTimeout: 10000 });

    console.log(LINHA);
    console.log(`Upload dos arquivos para ${caminhoRemoto}`);
    await executarComando(sftp, `rm -rf ${caminhoRemoto}`);
    await executarComando(sftp, `mkdir -p ${caminhoRemoto}`);
    await sftp.uploadDir(caminhoLocal, caminhoRemoto);

    console.log(LINHA);
    console.log(`${VERDE}Publicação concluída em ${servidor}.${RESET}`);
  } finally {
    await sftp.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
