import { Request, Router } from "express";
import { Query, Mutation } from "../Helper/Handler";
import { validate } from "../Helper/Validar";
import { NotFound } from "../Helper/AppError";
import { getContexto } from "../types/context";
import { CustomController } from "./EntityController";
import type { Usuario } from "@prisma/client";
import type { IUsuarioRepository } from "../Model/UsuarioModel";
import { AtualizarPerfilSchema } from "../Schema/PerfilSchema";
import { cifrar, decifrar } from "../Helper/CampoCifrado";

interface PerfilResponse {
  id: string;
  login: string;
  nome: string | null;
}

function build(usuario: Usuario): PerfilResponse {
  return {
    id: usuario.id.toString(),
    login: usuario.login,
    nome: decifrar(usuario.nome),
  };
}

export class PerfilController extends CustomController {
  constructor(private readonly repoUsuario: IUsuarioRepository) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.get("/perfil", Query((req) => this.Ver(req)));
    router.put("/perfil", Mutation("usuario", "PERFIL", (req) => this.Atualizar(req)));
  }

  private async Ver(req: Request): Promise<PerfilResponse> {
    const { usuarioId } = getContexto(req);
    const usuario = await this.repoUsuario.GetById(BigInt(usuarioId));
    if (!usuario) throw new NotFound("Usuário não encontrado");
    return build(usuario);
  }

  private async Atualizar(req: Request): Promise<PerfilResponse> {
    const { usuarioId } = getContexto(req);
    const dados = validate(AtualizarPerfilSchema, req.body);
    const patch = { ...dados };
    if (patch.nome !== undefined) patch.nome = cifrar(patch.nome) ?? undefined;
    const usuario = await this.repoUsuario.Update(BigInt(usuarioId), patch);
    return build(usuario);
  }
}
