#!/usr/bin/env node
// Gera o hash bcrypt de uma senha para gravar na coluna `senha` da tabela
// `usuario`. Não acessa o banco: só pergunta a senha e imprime o hash.
//
//   npm run criptografar-senha
//   INSERT INTO usuario (login, nome, senha) VALUES ('fulano', 'Fulano', '<hash>');
import readline from "node:readline";
import bcrypt from "bcryptjs";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Senha: ", async (senha) => {
  rl.close();
  if (!senha) {
    console.error("Senha vazia.");
    process.exit(1);
  }
  console.log(await bcrypt.hash(senha, 10));
});
