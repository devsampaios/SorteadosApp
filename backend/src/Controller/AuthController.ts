import { Request, Router } from "express";
import { Query } from "../Helper/Handler";
import { validate } from "../Helper/Validar";
import { Conflict, Forbidden } from "../Helper/AppError";
import { verifyIdToken } from "../Infra/Firebase";
import { signToken } from "../Middleware/Autenticacao";
import { descriptionOf } from "../Helper/Enum";
import { CustomController } from "./EntityController";
import { SituacaoUsuario } from "../Model/UsuarioModel";
import type { IUsuarioRepository } from "../Model/UsuarioModel";
import { Build } from "../Dto/AuthDto";
import { cifrar } from "../Helper/CampoCifrado";
import { SessaoSchema, RegistroSchema } from "../Schema/AuthSchema";
import type { SessaoResponse } from "../Model/AuthModel";

export class AuthController extends CustomController {
  constructor(private readonly repoUsuario: IUsuarioRepository) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.post("/auth/session", Query((req) => this.CriarSessao(req)));
    router.post("/auth/register", Query((req) => this.Registrar(req)));
  }

  private async Registrar(req: Request): Promise<{ status: number; dados: SessaoResponse }> {
    const { idToken, nome } = validate(RegistroSchema, req.body);
    const firebase = await verifyIdToken(idToken);

    const existente = await this.repoUsuario.PorFirebaseUid(firebase.uid);
    if (existente) throw new Conflict("Usuário já cadastrado");

    const usuario = await this.repoUsuario.Insert({
      firebaseUid: firebase.uid,
      email: firebase.email,
      nome: cifrar(nome ?? firebase.name) ?? undefined,
    });

    const token = signToken({ usuarioId: usuario.id.toString(), perfil: usuario.perfil ?? 2 });
    return { status: 201, dados: Build(usuario, token) };
  }

  private async CriarSessao(req: Request): Promise<SessaoResponse> {
    const { idToken } = validate(SessaoSchema, req.body);
    const firebase = await verifyIdToken(idToken);

    let usuario = await this.repoUsuario.PorFirebaseUid(firebase.uid);
    if (!usuario) {
      usuario = await this.repoUsuario.Insert({
        firebaseUid: firebase.uid,
        email: firebase.email,
        nome: cifrar(firebase.name) ?? undefined,
      });
    }

    const situacao = descriptionOf(SituacaoUsuario, usuario.situacao);
    if (situacao && situacao !== "ATIVO") throw new Forbidden("Usuário sem acesso");

    const token = signToken({ usuarioId: usuario.id.toString(), perfil: usuario.perfil ?? 2 });
    return Build(usuario, token);
  }
}
