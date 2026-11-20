import type { Usuario } from "@prisma/client";
import type { SessaoResponse } from "../Model/AuthModel";
import { decifrar } from "../Helper/CampoCifrado";

export function Build(usuario: Usuario, token: string): SessaoResponse {
  return {
    token,
    usuarioId: usuario.id.toString(),
    login: usuario.login,
    nome: decifrar(usuario.nome),
  };
}
