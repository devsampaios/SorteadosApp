import type { Usuario } from "@prisma/client";
import { Db } from "../Infra/Db";
import { generateCode } from "../Helper/crypto";
import { BaseRepository } from "./BaseRepository";
import type { WriteDelegate } from "./Contracts";
import type {
  CriarDisciplinaUsuario,
  CriarUsuarioData,
  AtualizarUsuarioData,
  IUsuarioRepository,
  UsuarioComDisciplinas,
} from "../Model/UsuarioModel";

export class UsuarioRepository
  extends BaseRepository<UsuarioComDisciplinas, CriarUsuarioData, AtualizarUsuarioData>
  implements IUsuarioRepository
{
  protected delegate(): WriteDelegate<UsuarioComDisciplinas, CriarUsuarioData, AtualizarUsuarioData> {
    return Db().usuario as unknown as WriteDelegate<UsuarioComDisciplinas, CriarUsuarioData, AtualizarUsuarioData>;
  }

  PorEmail(email: string): Promise<Usuario | null> {
    return Db().usuario.findUnique({ where: { email } });
  }

  PorFirebaseUid(firebaseUid: string): Promise<Usuario | null> {
    return Db().usuario.findUnique({ where: { firebaseUid } });
  }

  async PorIdComDisciplinas(id: bigint): Promise<UsuarioComDisciplinas | null> {
    const usuario = await Db().usuario.findUnique({ where: { id } });
    if (!usuario) {
      return null;
    }
    const disciplinas = await Db().disciplina.findMany({
      where: { disciplinaUsuarios: { some: { usuarioId: id } } },
      orderBy: { id: "desc" },
    });
    return { ...usuario, disciplinas };
  }

  async SincronizarDisciplinas(usuarioId: bigint, disciplinas: CriarDisciplinaUsuario[]): Promise<void> {
    // Vínculos onde o usuário é DONO — só essas disciplinas podem ser
    // criadas/editadas/removidas por aqui.
    const links = await Db().disciplinaUsuario.findMany({ where: { usuarioId, papel: 1 }, select: { disciplinaId: true } });
    const idsExistentes = links.map((l) => l.disciplinaId);
    const idsPayload = disciplinas.filter((d) => d.id).map((d) => BigInt(d.id as string));

    const removidos = idsExistentes.filter((did) => !idsPayload.some((p) => p === did));
    if (removidos.length) {
      // Exclusão física: o cascade remove avaliações, tópicos, presenças e vínculos.
      await Db().disciplina.deleteMany({ where: { id: { in: removidos } } });
    }

    for (const d of disciplinas.filter((d) => d.id)) {
      await Db().disciplina.update({
        where: { id: BigInt(d.id as string) },
        data: { nome: d.nome, professor: d.professor, sala: d.sala, cargaHoraria: d.cargaHoraria },
      });
    }

    for (const d of disciplinas.filter((d) => !d.id)) {
      // Disciplina criada para o usuário: ele entra como dono já aprovado.
      await Db().disciplina.create({
        data: {
          codigo: generateCode(6),
          criadorId: usuarioId,
          nome: d.nome,
          professor: d.professor,
          sala: d.sala,
          cargaHoraria: d.cargaHoraria,
          disciplinaUsuarios: { create: { usuarioId, papel: 1, situacao: 1 } },
        },
      });
    }
  }
}
