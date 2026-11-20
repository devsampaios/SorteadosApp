import type { Usuario } from "@prisma/client";
import { descriptionOf } from "../Helper/Enum";
import { PerfilUsuario } from "../Model/UsuarioModel";
import type { SessaoResponse } from "../Model/AuthModel";
import { decifrar } from "../Helper/CampoCifrado";

export function Build(usuario: Usuario, token: string): SessaoResponse {
  return {
    token,
    usuarioId: usuario.id.toString(),
    email: usuario.email,
    nome: decifrar(usuario.nome),
    perfil: descriptionOf(PerfilUsuario, usuario.perfil) ?? "USUARIO",
  };
}
