import { Request, Router } from "express";
import { Query } from "../Helper/Handler";
import { authRateLimit } from "../Middleware/RateLimit";
import { validate } from "../Helper/Validar";
import { Forbidden, Unauthorized } from "../Helper/AppError";
import { signToken } from "../Middleware/Autenticacao";
import { descriptionOf } from "../Helper/Enum";
import { senhaConfere } from "../Helper/Senha";
import { CustomController } from "./EntityController";
import { SituacaoUsuario } from "../Model/UsuarioModel";
import type { IUsuarioRepository } from "../Model/UsuarioModel";
import { Build } from "../Dto/AuthDto";
import { LoginSchema } from "../Schema/AuthSchema";
import type { SessaoResponse } from "../Model/AuthModel";

const CREDENCIAIS_INVALIDAS = "Login ou senha inválidos";

export class AuthController extends CustomController {
  constructor(private readonly repoUsuario: IUsuarioRepository) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.post("/auth/login", authRateLimit, Query((req) => this.Login(req)));
  }

  // Busca o usuário pelo login e compara a senha com o hash do banco. Login
  // inexistente e senha errada devolvem a mesma mensagem, pra não revelar
  // quais logins existem.
  private async Login(req: Request): Promise<SessaoResponse> {
    const { login, senha } = validate(LoginSchema, req.body);

    const usuario = await this.repoUsuario.PorLogin(login);
    if (!usuario || !(await senhaConfere(senha, usuario.senha))) {
      throw new Unauthorized(CREDENCIAIS_INVALIDAS);
    }

    const situacao = descriptionOf(SituacaoUsuario, usuario.situacao);
    if (situacao && situacao !== "ATIVO") throw new Forbidden("Usuário sem acesso");

    const token = signToken({ usuarioId: usuario.id.toString() });
    return Build(usuario, token);
  }
}
