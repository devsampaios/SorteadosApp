import { Prisma, type Disciplina, type DisciplinaUsuario } from "@prisma/client";
import { generateCode } from "../Helper/crypto";
import { BaseRepository } from "./BaseRepository";
import { toSkipTake, type PageOptions, type Page } from "../Helper/Paginar";
import type { WriteDelegate } from "./Contracts";
import { PAPEL_DONO, PAPEL_MEMBRO, MEMBRO_APROVADO, MEMBRO_PENDENTE } from "../Model/DisciplinaModel";
import type {
  CriarDisciplina,
  AtualizarDisciplina,
  CriarAvaliacao,
  DefinirNota,
  AulasDaDisciplina,
  IDisciplinaRepository,
  DisciplinaComArvore,
  AvaliacaoComContexto,
  DadosUsuarioDisciplina,
} from "../Model/DisciplinaModel";

// Árvore da disciplina incluindo apenas a nota do usuário logado em cada
// avaliação e o vínculo do próprio usuário (para saber o papel).
const incluirArvore = (usuarioId: bigint) =>
  ({
    horarios: true,
    avaliacoes: { include: { notas: { where: { usuarioId } } } },
    presencas: { where: { usuarioId } },
    disciplinaUsuarios: { where: { usuarioId } },
  }) satisfies Prisma.DisciplinaInclude;

function montarHorarios(dados: CriarDisciplina | AtualizarDisciplina): Prisma.DisciplinaHorarioCreateWithoutDisciplinaInput[] {
  return (dados.horarios ?? []).map((h) => ({ diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFim: h.horaFim }));
}

function montarAvaliacoes(dados: CriarDisciplina): Prisma.AvaliacaoCreateWithoutDisciplinaInput[] {
  return (dados.avaliacoes ?? []).map((a) => ({ nome: a.nome, data: a.data ?? null, pontuacaoMaxima: a.pontuacaoMaxima }));
}

export class DisciplinaRepository
  extends BaseRepository<Disciplina, Prisma.DisciplinaUncheckedCreateInput, Prisma.DisciplinaUncheckedUpdateInput>
  implements IDisciplinaRepository
{
  protected delegate(): WriteDelegate<Disciplina, Prisma.DisciplinaUncheckedCreateInput, Prisma.DisciplinaUncheckedUpdateInput> {
    return this.db.disciplina as unknown as WriteDelegate<Disciplina, Prisma.DisciplinaUncheckedCreateInput, Prisma.DisciplinaUncheckedUpdateInput>;
  }

  // Exclusão física: o cascade remove avaliações, tópicos, presenças, horários
  // e vínculos da disciplina.
  async Delete(id: bigint): Promise<void> {
    await this.db.disciplina.delete({ where: { id } });
  }

  async ListarPorUsuario(usuarioId: bigint, opcoes: PageOptions): Promise<Page<DisciplinaComArvore>> {
    const { skip, take, pageSize } = toSkipTake(opcoes);
    // Só disciplinas em que o usuário é membro APROVADO (pendentes não aparecem).
    const where = { disciplinaUsuarios: { some: { usuarioId, situacao: MEMBRO_APROVADO } } };
    const [items, count] = await Promise.all([
      this.db.disciplina.findMany({
        where,
        skip,
        take,
        orderBy: { id: "desc" },
        include: incluirArvore(usuarioId),
      }),
      this.db.disciplina.count({ where }),
    ]);
    return { items, count, pageSize };
  }

  PorIdComArvore(id: bigint, usuarioId: bigint): Promise<DisciplinaComArvore | null> {
    return this.db.disciplina.findUnique({ where: { id }, include: incluirArvore(usuarioId) });
  }

  async CriarComArvore(usuarioId: bigint, dados: CriarDisciplina): Promise<DisciplinaComArvore> {
    const disciplina = await this.db.disciplina.create({
      data: {
        codigo: generateCode(6),
        criadorId: usuarioId,
        nome: dados.nome,
        professor: dados.professor,
        sala: dados.sala,
        cargaHoraria: dados.cargaHoraria,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        horarios: { create: montarHorarios(dados) },
        avaliacoes: { create: montarAvaliacoes(dados) },
        // O criador entra como DONO já aprovado.
        disciplinaUsuarios: { create: { usuarioId, papel: PAPEL_DONO, situacao: MEMBRO_APROVADO } },
      },
      include: incluirArvore(usuarioId),
    });
    return disciplina;
  }

  Vinculo(disciplinaId: bigint, usuarioId: bigint): Promise<DisciplinaUsuario | null> {
    return this.db.disciplinaUsuario.findUnique({ where: { usuarioId_disciplinaId: { usuarioId, disciplinaId } } });
  }

  PorCodigo(codigo: string): Promise<Disciplina | null> {
    return this.db.disciplina.findFirst({ where: { codigo } });
  }

  async Solicitar(disciplinaId: bigint, usuarioId: bigint): Promise<void> {
    await this.db.disciplinaUsuario.create({
      data: { usuarioId, disciplinaId, papel: PAPEL_MEMBRO, situacao: MEMBRO_PENDENTE },
    });
  }

  async Aprovar(disciplinaId: bigint, usuarioId: bigint): Promise<void> {
    await this.db.disciplinaUsuario.update({
      where: { usuarioId_disciplinaId: { usuarioId, disciplinaId } },
      data: { situacao: MEMBRO_APROVADO },
    });
  }

  async RemoverVinculo(disciplinaId: bigint, usuarioId: bigint): Promise<void> {
    await this.db.disciplinaUsuario.delete({ where: { usuarioId_disciplinaId: { usuarioId, disciplinaId } } });
  }

  ContarPendentes(disciplinaId: bigint): Promise<number> {
    return this.db.disciplinaUsuario.count({ where: { disciplinaId, situacao: MEMBRO_PENDENTE } });
  }

  async ListarMembros(disciplinaId: bigint): Promise<DadosUsuarioDisciplina[]> {
    const vinculos = await this.db.disciplinaUsuario.findMany({ where: { disciplinaId }, orderBy: { criadoEm: "asc" } });
    if (vinculos.length === 0) return [];
    // DisciplinaUsuario não tem FK para usuario (referência solta): junta manualmente.
    const usuarios = await this.db.usuario.findMany({
      where: { id: { in: vinculos.map((v) => v.usuarioId) } },
      select: { id: true, nome: true, email: true },
    });
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    return vinculos.map((v) => ({
      usuarioId: v.usuarioId,
      papel: v.papel,
      situacao: v.situacao,
      criadoEm: v.criadoEm,
      nome: porId.get(v.usuarioId)?.nome ?? null,
      email: porId.get(v.usuarioId)?.email ?? "",
    }));
  }

  // include padrão para devolver avaliação + disciplina + nota do usuário.
  private incluirContexto(usuarioId: bigint) {
    return {
      disciplina: { select: { id: true, nome: true } },
      notas: { where: { usuarioId } },
    } satisfies Prisma.AvaliacaoInclude;
  }

  async CriarAvaliacao(disciplinaId: bigint, usuarioId: bigint, dados: CriarAvaliacao): Promise<AvaliacaoComContexto> {
    return this.db.avaliacao.create({
      data: {
        disciplinaId,
        nome: dados.nome,
        data: dados.data ?? null,
        pontuacaoMaxima: dados.pontuacaoMaxima,
      },
      include: this.incluirContexto(usuarioId),
    });
  }

  async AtualizarAvaliacao(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint, dados: CriarAvaliacao): Promise<AvaliacaoComContexto | null> {
    // Só edita se a avaliação pertencer a esta disciplina.
    const avaliacao = await this.db.avaliacao.findFirst({ where: { id: avaliacaoId, disciplinaId } });
    if (!avaliacao) return null;
    return this.db.avaliacao.update({
      where: { id: avaliacaoId },
      data: {
        nome: dados.nome,
        data: dados.data ?? null,
        pontuacaoMaxima: dados.pontuacaoMaxima,
      },
      include: this.incluirContexto(usuarioId),
    });
  }

  async ExcluirAvaliacao(disciplinaId: bigint, avaliacaoId: bigint): Promise<boolean> {
    // A avaliação só é removível se pertencer a esta disciplina.
    const avaliacao = await this.db.avaliacao.findFirst({ where: { id: avaliacaoId, disciplinaId } });
    if (!avaliacao) return false;
    await this.db.avaliacao.delete({ where: { id: avaliacaoId } });
    return true;
  }

  private async avaliacaoNaDisciplina(disciplinaId: bigint, avaliacaoId: bigint): Promise<boolean> {
    const avaliacao = await this.db.avaliacao.findFirst({ where: { id: avaliacaoId, disciplinaId }, select: { id: true } });
    return avaliacao !== null;
  }

  async DefinirNota(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint, dados: DefinirNota): Promise<boolean> {
    if (!(await this.avaliacaoNaDisciplina(disciplinaId, avaliacaoId))) return false;
    await this.db.notaAvaliacao.upsert({
      where: { avaliacaoId_usuarioId: { avaliacaoId, usuarioId } },
      create: { avaliacaoId, usuarioId, pontuacaoObtida: dados.pontuacaoObtida },
      update: { pontuacaoObtida: dados.pontuacaoObtida },
    });
    return true;
  }

  async RemoverNota(disciplinaId: bigint, avaliacaoId: bigint, usuarioId: bigint): Promise<boolean> {
    if (!(await this.avaliacaoNaDisciplina(disciplinaId, avaliacaoId))) return false;
    await this.db.notaAvaliacao.deleteMany({ where: { avaliacaoId, usuarioId } });
    return true;
  }

  async AulasDaDisciplina(disciplinaId: bigint, usuarioId: bigint): Promise<AulasDaDisciplina> {
    const [topicos, presencas] = await Promise.all([
      this.db.aulaTopico.findMany({ where: { disciplinaId }, select: { data: true, topico: true } }),
      this.db.presenca.findMany({ where: { disciplinaId, usuarioId }, select: { data: true } }),
    ]);
    return { topicos, presencas: presencas.map((p) => p.data) };
  }

  async DefinirTopico(disciplinaId: bigint, data: Date, topico: string): Promise<void> {
    if (topico.trim() === "") {
      await this.db.aulaTopico.deleteMany({ where: { disciplinaId, data } });
    } else {
      await this.db.aulaTopico.upsert({
        where: { disciplinaId_data: { disciplinaId, data } },
        create: { disciplinaId, data, topico },
        update: { topico },
      });
    }
  }

  async DefinirPresenca(disciplinaId: bigint, usuarioId: bigint, data: Date, presente: boolean): Promise<void> {
    if (presente) {
      await this.db.presenca.upsert({
        where: { disciplinaId_usuarioId_data: { disciplinaId, usuarioId, data } },
        create: { disciplinaId, usuarioId, data, status: 1 },
        update: { status: 1 },
      });
    } else {
      await this.db.presenca.deleteMany({ where: { disciplinaId, usuarioId, data } });
    }
  }

  async AtualizarComArvore(id: bigint, usuarioId: bigint, dados: AtualizarDisciplina): Promise<DisciplinaComArvore> {
    await this.db.disciplina.update({
      where: { id },
      data: {
        nome: dados.nome,
        professor: dados.professor,
        sala: dados.sala,
        cargaHoraria: dados.cargaHoraria,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
      },
    });
    if (dados.horarios !== undefined) {
      await this.db.disciplinaHorario.deleteMany({ where: { disciplinaId: id } });
      await this.db.disciplina.update({ where: { id }, data: { horarios: { create: montarHorarios(dados) } } });
    }
    const disciplina = await this.PorIdComArvore(id, usuarioId);
    return disciplina as DisciplinaComArvore;
  }
}
