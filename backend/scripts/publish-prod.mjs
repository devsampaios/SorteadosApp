#!/usr/bin/env node
// Publica a API no ambiente de HOMOLOGAÇÃO e reinicia o serviço systemd
// (ver backend/deploy/learning.service). Só pede a senha SSH — o resto é fixo
// aqui embaixo.
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
const caminhoLocalDist = path.resolve(__dirname, "../dist");
const caminhoLocalPrisma = path.resolve(__dirname, "../prisma");
const caminhoLocalPackageJson = path.resolve(__dirname, "../package.json");
const caminhoLocalPackageLock = path.resolve(__dirname, "../package-lock.json");
const caminhoLocalSetupTabelas = path.resolve(__dirname, "setup-tabelas.mjs");
const caminhoRemoto = "/opt/app/learning/api";
const caminhoTemporarioRemoto = "/opt/app/learning/api-temp";
// Nome do serviço em /etc/systemd/system/learning.service. As chamadas usam
// `sudo` porque a conexão SSH é feita como usuário "learning" (não root) —
// configure NOPASSWD no sudoers pra esses comandos específicos, senão o
// script fica esperando uma senha de sudo que nunca chega.
const servicoSystemd = "learning";
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
  console.log("Publicação da API para o ambiente de HOMOLOGAÇÃO");
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
    console.log(`Upload dos arquivos para ${caminhoTemporarioRemoto}`);
    // Limpa o staging ANTES de subir: o uploadDir só adiciona/sobrescreve, então
    // arquivos removidos do projeto (ex.: schemas de tabelas deletadas) ficariam
    // órfãos aqui de um deploy anterior e voltariam para api/ na cópia.
    await executarComando(sftp, `rm -rf ${caminhoTemporarioRemoto}`);
    await executarComando(sftp, `mkdir -p ${caminhoTemporarioRemoto}`);
    // dist/ e prisma/ inteiros, mais os dois arquivos que o `npm ci` precisa
    // pra reinstalar as dependências no servidor.
    await sftp.uploadDir(caminhoLocalDist, `${caminhoTemporarioRemoto}/dist`);
    await sftp.uploadDir(caminhoLocalPrisma, `${caminhoTemporarioRemoto}/prisma`);
    await sftp.put(caminhoLocalPackageJson, `${caminhoTemporarioRemoto}/package.json`);
    await sftp.put(caminhoLocalPackageLock, `${caminhoTemporarioRemoto}/package-lock.json`);
    await executarComando(sftp, `mkdir -p ${caminhoTemporarioRemoto}/scripts`);
    await sftp.put(caminhoLocalSetupTabelas, `${caminhoTemporarioRemoto}/scripts/setup-tabelas.mjs`);
    // config.json NÃO é enviado: fica só no servidor, com os segredos de produção.

    console.log(LINHA);
    console.log("Parando o serviço...");
    await executarComando(sftp, `sudo systemctl stop ${servicoSystemd}`);

    console.log(LINHA);
    console.log(`Copiando ${caminhoTemporarioRemoto} -> ${caminhoRemoto}`);
    await executarComando(sftp, `mkdir -p ${caminhoRemoto}`);
    // Remove dist/ e prisma/ antigos ANTES de copiar: o `cp` só sobrescreve e
    // adiciona — não apaga arquivos que foram removidos do projeto (ex.: schemas
    // de tabelas deletadas), que ficariam órfãos e quebrariam o prisma generate.
    // Ambas as pastas são reenviadas inteiras, e config.json fica na raiz de
    // api/ (fora de prisma/dist), então não é afetado.
    await executarComando(sftp, `rm -rf ${caminhoRemoto}/dist ${caminhoRemoto}/prisma`);
    await executarComando(sftp, `cp -rf ${caminhoTemporarioRemoto}/. ${caminhoRemoto}/`);

    console.log(LINHA);
    console.log("Instalando dependências (npm ci --omit=dev)...");
    await executarComando(sftp, `cd ${caminhoRemoto} && npm ci --omit=dev`);

    console.log(LINHA);
    console.log("Gerando o Prisma Client...");
    // `prisma` é devDependency (omitida no --omit=dev), então roda via npx com a
    // versão fixada para casar com o @prisma/client instalado. Usa o schema em
    // prisma/schema (config em package.json).
    const gerar = await executarComando(sftp, `cd ${caminhoRemoto} && npx --yes prisma@5.22.0 generate`);
    if (gerar.codigo !== 0) {
      throw new Error("prisma generate falhou — confira o schema/saída acima.");
    }

    console.log(LINHA);
    console.log("Iniciando o serviço...");
    await executarComando(sftp, `sudo systemctl start ${servicoSystemd}.service`);
    const { saida } = await executarComando(sftp, `sudo systemctl status ${servicoSystemd}.service`);
    if (!saida.includes("active (running)")) {
      throw new Error("Serviço não ficou ativo depois do start — confira o status acima.");
    }

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
