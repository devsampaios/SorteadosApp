export interface IdTokenInput {
  idToken: string;
}

export interface RegistroInput {
  idToken: string;
  nome?: string;
}

export interface SessaoResponse {
  token: string;
  usuarioId: string;
  email: string;
  nome: string | null;
  perfil: string;
}
