import type { Conteudo } from "@prisma/client";
import { Db } from "../Infra/Db";
import { cifrar } from "../Helper/CampoCifrado";
import type { CriarConteudo, ConteudoComAutor, IConteudoRepository } from "../Model/ConteudoModel";

export class ConteudoRepository implements IConteudoRepository {
  // Junta o autor manualmente (usuarioId é referência solta, sem FK).
  private async comAutores(conteudos: Conteudo[]): Promise<ConteudoComAutor[]> {
    if (conteudos.length === 0) return [];
    const usuarios = await Db().usuario.findMany({
      where: { id: { in: [...new Set(conteudos.map((c) => c.usuarioId))] } },
      select: { id: true, nome: true, email: true },
    });
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    return conteudos.map((c) => ({
      ...c,
      autorNome: porId.get(c.usuarioId)?.nome ?? null,
      autorEmail: porId.get(c.usuarioId)?.email ?? "",
    }));
  }

  async ListarPorDisciplina(disciplinaId: bigint): Promise<ConteudoComAutor[]> {
    const conteudos = await Db().conteudo.findMany({ where: { disciplinaId }, orderBy: { id: "asc" } });
    return this.comAutores(conteudos);
  }

  async Criar(disciplinaId: bigint, usuarioId: bigint, dados: CriarConteudo): Promise<ConteudoComAutor> {
    const conteudo = await Db().conteudo.create({
      data: {
        disciplinaId,
        usuarioId,
        tipo: dados.tipo,
        texto: cifrar(dados.texto),
        link: cifrar(dados.link),
        arquivoId: dados.arquivoId ?? null,
      },
    });
    const [comAutor] = await this.comAutores([conteudo]);
    return comAutor;
  }

  PorId(id: bigint): Promise<Conteudo | null> {
    return Db().conteudo.findUnique({ where: { id } });
  }

  async Excluir(id: bigint): Promise<void> {
    await Db().conteudo.delete({ where: { id } });
  }
}
