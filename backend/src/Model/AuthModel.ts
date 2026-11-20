export interface LoginInput {
  login: string;
  senha: string;
}

export interface SessaoResponse {
  token: string;
  usuarioId: string;
  login: string;
  nome: string | null;
}
