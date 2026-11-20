import type { Usuario } from "@prisma/client";
import { Db } from "../Infra/Db";
import { BaseRepository } from "./BaseRepository";
import type { WriteDelegate } from "./Contracts";
import type { CriarUsuarioData, AtualizarUsuarioData, IUsuarioRepository } from "../Model/UsuarioModel";

export class UsuarioRepository
  extends BaseRepository<Usuario, CriarUsuarioData, AtualizarUsuarioData>
  implements IUsuarioRepository
{
  protected delegate(): WriteDelegate<Usuario, CriarUsuarioData, AtualizarUsuarioData> {
    return Db().usuario as unknown as WriteDelegate<Usuario, CriarUsuarioData, AtualizarUsuarioData>;
  }

  PorLogin(login: string): Promise<Usuario | null> {
    return Db().usuario.findUnique({ where: { login } });
  }
}
