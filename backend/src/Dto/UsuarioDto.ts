import type { Usuario, Disciplina } from "@prisma/client";
import { describe } from "../Helper/Enum";
import { PerfilUsuario, SituacaoUsuario, type UsuarioResponse } from "../Model/UsuarioModel";
import { BuildResumo } from "./DisciplinaDto";
import { decifrar } from "../Helper/CampoCifrado";

export function Build(usuario: Usuario & { disciplinas?: Disciplina[] }): UsuarioResponse {
  return {
    id: usuario.id.toString(),
    email: usuario.email,
    nome: decifrar(usuario.nome),
    dataNascimento: usuario.dataNascimento?.toISOString().slice(0, 10) ?? null,
    perfil: describe(PerfilUsuario, usuario.perfil),
    situacao: describe(SituacaoUsuario, usuario.situacao),
    disciplinas: (usuario.disciplinas ?? []).map(BuildResumo),
  };
}
