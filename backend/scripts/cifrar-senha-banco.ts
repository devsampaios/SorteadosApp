#!/usr/bin/env node
// Converte uma senha digitada no terminal no valor cifrado que vai no campo
// database.password do config.json (revertido em memória pelo config.ts na
// inicialização — ver backend/src/config/index.ts).
//
// Usa a crypto.secret do config.json local (backend/config.json). Se o
// ambiente-alvo (ex.: homologação) tiver uma crypto.secret diferente da
// local, rode este script com o config.json daquele ambiente em mãos.
import { criptografarDeterministico } from "../src/helpers/crypto";
import configJson from "../config.json";

const LINHA = "==========================================================================";

function perguntarSenha(pergunta: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(pergunta);
    const stdin = process.stdin;
    const eraTTY = stdin.isTTY;
    if (eraTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let senha = "";
    const onData = (char: string) => {
      if (char === "\r" || char === "\n") return finalizar();
      if (char === "\u0003") {
        process.stdout.write("\n");
        process.exit(130);
      }
      if (char === "\u007f" || char === "\b") {
        if (senha.length > 0) {
          senha = senha.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }
      senha += char;
      process.stdout.write("*");
    };

    function finalizar() {
      if (eraTTY) stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(senha);
    }

    stdin.on("data", onData);
  });
}

async function main() {
  console.log(LINHA);
  console.log("Cifrar senha do banco (para database.password no config.json)");
  console.log(LINHA);

  const senha = await perguntarSenha("Senha: ");
  if (!senha) {
    console.error("Senha vazia — nada a fazer.");
    process.exitCode = 1;
    return;
  }
  const confirmacao = await perguntarSenha("Confirme a senha: ");
  if (senha !== confirmacao) {
    console.error("As senhas não conferem.");
    process.exitCode = 1;
    return;
  }

  const cifrado = criptografarDeterministico(configJson.crypto.secret, senha);

  console.log();
  console.log("Cole isto em database.password no config.json:");
  console.log();
  console.log(cifrado);
}

main();
