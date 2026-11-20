import { Request, Router } from "express";
import { toId } from "../Helper/crypto";
import { validate } from "../Helper/Validar";
import { Conflict, NotFound, Forbidden } from "../Helper/AppError";
import { Query, Mutation } from "../Helper/Handler";
import { buildPage, type Page } from "../Helper/Paginar";
import { getContexto } from "../types/context";
import { CustomController } from "./EntityController";
import type { DisciplinaUsuario } from "@prisma/client";
import { Build, BuildMembro, BuildAvaliacaoComContexto } from "../Dto/DisciplinaDto";
import { CriarDisciplinaSchema, AtualizarDisciplinaSchema, SolicitarSchema, AvaliacaoSchema, DefinirNotaSchema, DefinirTopicoSchema, DefinirPresencaSchema } from "../Schema/DisciplinaSchema";
import { PAPEL_DONO, MEMBRO_APROVADO } from "../Model/DisciplinaModel";
import type { DisciplinaResponse, AvaliacaoComContextoResponse, AulasDaDisciplinaResponse, MembroResponse, IDisciplinaRepository } from "../Model/DisciplinaModel";

const paraDataISO = (data: Date): string => data.toISOString().slice(0, 10);

export class DisciplinaController extends CustomController {
  constructor(private readonly repoDisciplina: IDisciplinaRepository) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.get("/disciplinas", Query((req) => this.Listar(req)));
    router.get("/disciplinas/:id", Query((req) => this.PorId(req)));
    router.post("/disciplinas", Mutation("disciplina", "CRIAR", (req) => this.Criar(req)));
    router.put("/disciplinas/:id", Mutation("disciplina", "ATUALIZAR", (req) => this.Atualizar(req)));
    router.delete("/disciplinas/:id", Mutation("disciplina", "EXCLUIR", (req) => this.Excluir(req)));
    router.post("/disciplinas/solicitacoes", Mutation("disciplina", "SOLICITAR", (req) => this.Solicitar(req)));
    router.delete("/disciplinas/:id/sair", Mutation("disciplina", "SAIR", (req) => this.Sair(req)));
    router.get("/disciplinas/:id/membros", Query((req) => this.Membros(req)));
    router.post("/disciplinas/:id/membros/:usuarioId/aprovar", Mutation("disciplina", "APROVAR_MEMBRO", (req) => this.Aprovar(req)));
    router.delete("/disciplinas/:id/membros/:usuarioId", Mutation("disciplina", "REMOVER_MEMBRO", (req) => this.RemoverMembro(req)));
    router.post("/disciplinas/:id/avaliacoes", Mutation("avaliacao", "CRIAR", (req) => this.CriarAvaliacao(req)));
    router.put("/disciplinas/:id/avaliacoes/:avaliacaoId", Mutation("avaliacao", "ATUALIZAR", (req) => this.AtualizarAvaliacao(req)));
    router.delete("/disciplinas/:id/avaliacoes/:avaliacaoId", Mutation("avaliacao", "EXCLUIR", (req) => this.ExcluirAvaliacao(req)));
    router.put("/disciplinas/:id/avaliacoes/:avaliacaoId/nota", Mutation("nota_avaliacao", "DEFINIR", (req) => this.DefinirNota(req)));
    router.delete("/disciplinas/:id/avaliacoes/:avaliacaoId/nota", Mutation("nota_avaliacao", "REMOVER", (req) => this.RemoverNota(req)));
    router.get("/disciplinas/:id/aulas", Query((req) => this.AulasDaDisciplina(req)));
    router.put("/disciplinas/:id/topico", Mutation("aula_topico", "DEFINIR", (req) => this.DefinirTopico(req)));
    router.put("/disciplinas/:id/presenca", Mutation("presenca", "DEFINIR", (req) => this.DefinirPresenca(req)));
  }

  // ===== CRUD com controle de acesso =====

  private async Listar(req: Request): Promise<Page<DisciplinaResponse>> {
    const { usuarioId } = getContexto(req);
    const pagina = await this.repoDisciplina.ListarPorUsuario(BigInt(usuarioId), {
      page: Number(req.query.page),
      pageSize: Number(req.query.pageSize),
    });
    const itens = pagina.items.map((disciplina) =>
      Build(disciplina, { papelDoUsuario: disciplina.disciplinaUsuarios[0]?.papel ?? null }),
    );
    return buildPage(itens, pagina.count, pagina.pageSize);
  }

  private async PorId(req: Request): Promise<DisciplinaResponse> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    const vinculo = await this.exigirAprovado(req, id);
    const disciplina = await this.repoDisciplina.PorIdComArvore(id, BigInt(usuarioId));
    if (!disciplina) throw new NotFound("Disciplina não encontrada");
    const ehDono = vinculo.papel === PAPEL_DONO;
    return Build(disciplina, {
      papelDoUsuario: vinculo.papel,
      qtdSolicitacoesPendentes: ehDono ? await this.repoDisciplina.ContarPendentes(id) : 0,
    });
  }

  private async Criar(req: Request): Promise<{ status: number; dados: DisciplinaResponse }> {
    const dados = validate(CriarDisciplinaSchema, req.body);
    const { usuarioId } = getContexto(req);
    const disciplina = await this.repoDisciplina.CriarComArvore(BigInt(usuarioId), dados);
    return { status: 201, dados: Build(disciplina, { papelDoUsuario: PAPEL_DONO, qtdSolicitacoesPendentes: 0 }) };
  }

  private async Atualizar(req: Request): Promise<DisciplinaResponse> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirDono(req, id);
    const dados = validate(AtualizarDisciplinaSchema, req.body);
    const disciplina = await this.repoDisciplina.AtualizarComArvore(id, BigInt(usuarioId), dados);
    return Build(disciplina, {
      papelDoUsuario: PAPEL_DONO,
      qtdSolicitacoesPendentes: await this.repoDisciplina.ContarPendentes(id),
    });
  }

  private async Excluir(req: Request): Promise<{ status: number; dados: { message: string } }> {
    const id = toId(req.params.id);
    await this.exigirDono(req, id);
    await this.repoDisciplina.Delete(id);
    return { status: 200, dados: { message: "excluido" } };
  }

  // ===== Participação / solicitações =====

  private async Solicitar(req: Request): Promise<{ status: number; dados: { message: string; disciplina: string } }> {
    const { codigo } = validate(SolicitarSchema, req.body);
    const { usuarioId } = getContexto(req);
    const uid = BigInt(usuarioId);
    const disciplina = await this.repoDisciplina.PorCodigo(codigo);
    if (!disciplina) throw new NotFound("Nenhuma disciplina encontrada para este código");

    const existente = await this.repoDisciplina.Vinculo(disciplina.id, uid);
    if (existente) {
      if (existente.situacao === MEMBRO_APROVADO) throw new Conflict("Você já participa desta disciplina");
      throw new Conflict("Você já tem uma solicitação pendente para esta disciplina");
    }

    await this.repoDisciplina.Solicitar(disciplina.id, uid);
    return { status: 201, dados: { message: "Solicitação enviada", disciplina: disciplina.nome } };
  }

  // O próprio usuário sai da disciplina. O dono não sai por aqui (deve excluir
  // a disciplina).
  private async Sair(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    const uid = BigInt(usuarioId);
    const vinculo = await this.repoDisciplina.Vinculo(id, uid);
    if (!vinculo) throw new NotFound("Você não participa desta disciplina");
    if (vinculo.papel === PAPEL_DONO) {
      throw new Conflict("O dono não pode sair; exclua a disciplina.");
    }
    await this.repoDisciplina.RemoverVinculo(id, uid);
    return { message: "saiu" };
  }

  private async Membros(req: Request): Promise<MembroResponse[]> {
    const id = toId(req.params.id);
    await this.exigirDono(req, id);
    const membros = await this.repoDisciplina.ListarMembros(id);
    return membros.map(BuildMembro);
  }

  private async Aprovar(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    await this.exigirDono(req, id);
    const alvo = toId(req.params.usuarioId);
    const vinculo = await this.repoDisciplina.Vinculo(id, alvo);
    if (!vinculo) throw new NotFound("Solicitação não encontrada");
    await this.repoDisciplina.Aprovar(id, alvo);
    return { message: "aprovado" };
  }

  private async RemoverMembro(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    await this.exigirDono(req, id);
    const alvo = toId(req.params.usuarioId);
    const { usuarioId } = getContexto(req);
    // Recusa uma solicitação OU remove um membro. O dono não sai por aqui.
    if (alvo === BigInt(usuarioId)) throw new Conflict("O dono não pode remover a si mesmo da disciplina");
    const vinculo = await this.repoDisciplina.Vinculo(id, alvo);
    if (!vinculo) throw new NotFound("Vínculo não encontrado");
    await this.repoDisciplina.RemoverVinculo(id, alvo);
    return { message: "removido" };
  }

  // ===== Avaliações =====
  // Definição e nota criadas/editadas por qualquer membro aprovado.

  private async CriarAvaliacao(req: Request): Promise<{ status: number; dados: AvaliacaoComContextoResponse }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const dados = validate(AvaliacaoSchema, req.body);
    const avaliacao = await this.repoDisciplina.CriarAvaliacao(id, BigInt(usuarioId), dados);
    return { status: 201, dados: BuildAvaliacaoComContexto(avaliacao) };
  }

  private async AtualizarAvaliacao(req: Request): Promise<AvaliacaoComContextoResponse> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const avaliacaoId = toId(req.params.avaliacaoId);
    const dados = validate(AvaliacaoSchema, req.body);
    const avaliacao = await this.repoDisciplina.AtualizarAvaliacao(id, avaliacaoId, BigInt(usuarioId), dados);
    if (!avaliacao) throw new NotFound("Avaliação não encontrada nesta disciplina");
    return BuildAvaliacaoComContexto(avaliacao);
  }

  private async ExcluirAvaliacao(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    await this.exigirAprovado(req, id);
    const avaliacaoId = toId(req.params.avaliacaoId);
    const removida = await this.repoDisciplina.ExcluirAvaliacao(id, avaliacaoId);
    if (!removida) throw new NotFound("Avaliação não encontrada nesta disciplina");
    return { message: "removido" };
  }

  private async DefinirNota(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const avaliacaoId = toId(req.params.avaliacaoId);
    const dados = validate(DefinirNotaSchema, req.body);
    const ok = await this.repoDisciplina.DefinirNota(id, avaliacaoId, BigInt(usuarioId), dados);
    if (!ok) throw new NotFound("Avaliação não encontrada nesta disciplina");
    return { message: "salvo" };
  }

  private async RemoverNota(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const avaliacaoId = toId(req.params.avaliacaoId);
    const ok = await this.repoDisciplina.RemoverNota(id, avaliacaoId, BigInt(usuarioId));
    if (!ok) throw new NotFound("Avaliação não encontrada nesta disciplina");
    return { message: "removido" };
  }

  // ===== Aulas: tópicos (compartilhados) + presenças =====

  private async AulasDaDisciplina(req: Request): Promise<AulasDaDisciplinaResponse> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const dados = await this.repoDisciplina.AulasDaDisciplina(id, BigInt(usuarioId));
    return {
      topicos: dados.topicos.map((t) => ({ data: paraDataISO(t.data), topico: t.topico })),
      presencas: dados.presencas.map(paraDataISO),
    };
  }

  private async DefinirTopico(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    await this.exigirAprovado(req, id);
    const dados = validate(DefinirTopicoSchema, req.body);
    await this.repoDisciplina.DefinirTopico(id, dados.data, dados.topico);
    return { message: "salvo" };
  }

  private async DefinirPresenca(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const dados = validate(DefinirPresencaSchema, req.body);
    await this.repoDisciplina.DefinirPresenca(id, BigInt(usuarioId), dados.data, dados.presente);
    return { message: "salvo" };
  }

  // ===== Guards =====

  private async vinculoAtual(req: Request, disciplinaId: bigint): Promise<DisciplinaUsuario | null> {
    const { usuarioId } = getContexto(req);
    return this.repoDisciplina.Vinculo(disciplinaId, BigInt(usuarioId));
  }

  private async exigirAprovado(req: Request, disciplinaId: bigint): Promise<DisciplinaUsuario> {
    const vinculo = await this.vinculoAtual(req, disciplinaId);
    if (!vinculo || vinculo.situacao !== MEMBRO_APROVADO) {
      throw new Forbidden("Você não participa desta disciplina");
    }
    return vinculo;
  }

  private async exigirDono(req: Request, disciplinaId: bigint): Promise<void> {
    const vinculo = await this.vinculoAtual(req, disciplinaId);
    if (!vinculo || vinculo.papel !== PAPEL_DONO) {
      throw new Forbidden("Apenas o dono da disciplina pode fazer isso");
    }
  }
}
