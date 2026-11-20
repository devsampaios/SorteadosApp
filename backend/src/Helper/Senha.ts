import bcrypt from "bcryptjs";

const CUSTO = 10;

// Gera o hash bcrypt da senha (mesmo formato do script criptografar-senha).
export function criptografarSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

// Compara a senha digitada com o hash gravado no banco.
export function senhaConfere(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
