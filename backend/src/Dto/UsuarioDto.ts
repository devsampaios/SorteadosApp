import type { Usuario } from "@prisma/client";
import { describe } from "../Helper/Enum";
import { SituacaoUsuario, type UsuarioResponse } from "../Model/UsuarioModel";
import { decifrar } from "../Helper/CampoCifrado";

export function Build(usuario: Usuario): UsuarioResponse {
  return {
    id: usuario.id.toString(),
    login: usuario.login,
    nome: decifrar(usuario.nome),
    situacao: describe(SituacaoUsuario, usuario.situacao),
  };
}
