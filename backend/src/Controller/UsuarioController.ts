import { EntityController } from "./EntityController";
import { Conflict } from "../Helper/AppError";
import { Build } from "../Dto/UsuarioDto";
import { CriarUsuarioSchema, AtualizarUsuarioSchema } from "../Schema/UsuarioSchema";
import { cifrar } from "../Helper/CampoCifrado";
import { criptografarSenha } from "../Helper/Senha";
import type { Usuario } from "@prisma/client";
import type {
  CriarUsuario,
  AtualizarUsuario,
  CriarUsuarioData,
  AtualizarUsuarioData,
  UsuarioResponse,
  IUsuarioRepository,
} from "../Model/UsuarioModel";

export class UsuarioController extends EntityController<
  Usuario,
  UsuarioResponse,
  CriarUsuario,
  AtualizarUsuario,
  CriarUsuarioData,
  AtualizarUsuarioData
> {
  constructor(private readonly repoUsuario: IUsuarioRepository) {
    super(repoUsuario, "/usuarios", "usuario", CriarUsuarioSchema, AtualizarUsuarioSchema);
  }

  protected ConvertToResponse(entity: Usuario): UsuarioResponse {
    return Build(entity);
  }

  protected ConvertToInsert(request: CriarUsuario): CriarUsuarioData {
    return { ...request, nome: cifrar(request.nome) ?? undefined };
  }

  protected ConvertToUpdate(request: AtualizarUsuario, _current: Usuario): AtualizarUsuarioData {
    const data = { ...request };
    if (data.nome !== undefined) data.nome = cifrar(data.nome) ?? undefined;
    return data;
  }

  protected async BeforePost(request: CriarUsuario): Promise<void> {
    await this.validarUsoDoLogin(request.login);
    // A senha chega em texto puro e segue para o insert já como hash bcrypt.
    request.senha = await criptografarSenha(request.senha);
  }

  protected async BeforePut(id: bigint, request: AtualizarUsuario): Promise<void> {
    if (request.login) await this.validarUsoDoLogin(request.login, id);
  }

  private async validarUsoDoLogin(login: string, ignorarId?: bigint): Promise<void> {
    const existente = await this.repoUsuario.PorLogin(login);
    if (existente && existente.id !== ignorarId) {
      throw new Conflict(`Login já cadastrado: ${login}`);
    }
  }
}
