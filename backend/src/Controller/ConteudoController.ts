import { Request, Router } from "express";
import { toId } from "../Helper/crypto";
import { validate } from "../Helper/Validar";
import { NotFound, Forbidden } from "../Helper/AppError";
import { Query, Mutation } from "../Helper/Handler";
import { getContexto } from "../types/context";
import { CustomController } from "./EntityController";
import { Build } from "../Dto/ConteudoDto";
import { CriarConteudoSchema } from "../Schema/ConteudoSchema";
import { PAPEL_DONO, MEMBRO_APROVADO } from "../Model/DisciplinaModel";
import type { IDisciplinaRepository } from "../Model/DisciplinaModel";
import type { ConteudoResponse, IConteudoRepository } from "../Model/ConteudoModel";

export class ConteudoController extends CustomController {
  constructor(
    private readonly repoConteudo: IConteudoRepository,
    // Reaproveita o vínculo usuário↔disciplina para os guards de acesso.
    private readonly repoDisciplina: IDisciplinaRepository,
  ) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.get("/disciplinas/:id/conteudos", Query((req) => this.Listar(req)));
    router.post("/disciplinas/:id/conteudos", Mutation("conteudo", "CRIAR", (req) => this.Criar(req)));
    router.delete("/disciplinas/:id/conteudos/:conteudoId", Mutation("conteudo", "EXCLUIR", (req) => this.Excluir(req)));
  }

  private async Listar(req: Request): Promise<ConteudoResponse[]> {
    const id = toId(req.params.id);
    await this.exigirAprovado(req, id);
    const conteudos = await this.repoConteudo.ListarPorDisciplina(id);
    return conteudos.map(Build);
  }

  private async Criar(req: Request): Promise<{ status: number; dados: ConteudoResponse }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    await this.exigirAprovado(req, id);
    const dados = validate(CriarConteudoSchema, req.body);
    const conteudo = await this.repoConteudo.Criar(id, BigInt(usuarioId), dados);
    return { status: 201, dados: Build(conteudo) };
  }

  // Exclusão: o próprio autor ou o dono da disciplina.
  private async Excluir(req: Request): Promise<{ message: string }> {
    const id = toId(req.params.id);
    const { usuarioId } = getContexto(req);
    const vinculo = await this.exigirAprovado(req, id);
    const conteudoId = toId(req.params.conteudoId);
    const conteudo = await this.repoConteudo.PorId(conteudoId);
    if (!conteudo || conteudo.disciplinaId !== id) throw new NotFound("Conteúdo não encontrado");
    const ehAutor = conteudo.usuarioId === BigInt(usuarioId);
    const ehDono = vinculo.papel === PAPEL_DONO;
    if (!ehAutor && !ehDono) throw new Forbidden("Só o autor ou o dono pode excluir este conteúdo");
    await this.repoConteudo.Excluir(conteudoId);
    return { message: "removido" };
  }

  private async exigirAprovado(req: Request, disciplinaId: bigint) {
    const { usuarioId } = getContexto(req);
    const vinculo = await this.repoDisciplina.Vinculo(disciplinaId, BigInt(usuarioId));
    if (!vinculo || vinculo.situacao !== MEMBRO_APROVADO) {
      throw new Forbidden("Você não participa desta disciplina");
    }
    return vinculo;
  }
}
