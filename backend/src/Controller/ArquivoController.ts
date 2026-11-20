import { NextFunction, Request, Response, Router } from "express";
import { Query, Mutation } from "../Helper/Handler";
import { validate } from "../Helper/Validar";
import { toId } from "../Helper/crypto";
import { NotFound } from "../Helper/AppError";
import { getContexto } from "../types/context";
import { saveBinary, readBinary } from "../Infra/Storage";
import { extensaoDe } from "../Helper/TiposDeArquivo";
import { CustomController } from "./EntityController";
import { Build } from "../Dto/ArquivoDto";
import { CriarArquivoSchema } from "../Schema/ArquivoSchema";
import type { Arquivo } from "@prisma/client";
import type { ArquivoResponse, IArquivoRepository } from "../Model/ArquivoModel";

export class ArquivoController extends CustomController {
  private readonly caminho = "/arquivos";

  constructor(private readonly repoArquivo: IArquivoRepository) {
    super();
  }

  RegisterRoutes(router: Router): void {
    router.get(this.caminho, Query((req) => this.PorUsuario(req)));
    router.get(`${this.caminho}/:id`, (req, res, next) => this.Baixar(req, res, next));
    router.post(this.caminho, Mutation("arquivo", "CRIAR", (req) => this.Criar(req)));
    router.patch(`${this.caminho}/:id/permanente`, Mutation("arquivo", "PERMANENTE", (req) => this.MarcarPermanente(req)));
  }

  private async PorUsuario(req: Request): Promise<ArquivoResponse[]> {
    const arquivos = await this.repoArquivo.PorUsuario(toId(String(req.query.usuarioId)));
    return arquivos.map(Build);
  }

  private async Criar(req: Request): Promise<{ status: number; dados: ArquivoResponse }> {
    const { conteudo, nome, mimeType } = validate(CriarArquivoSchema, req.body);
    // Extensão derivada do mime (mapa) e saneada — nunca vem crua do cliente.
    const extensao = extensaoDe(mimeType);
    // O dono do arquivo é sempre quem está autenticado — não confiamos no corpo.
    const { usuarioId } = getContexto(req);
    const arquivo = await this.repoArquivo.Criar({ nome, extensao, mimeType, usuarioId: BigInt(usuarioId) });
    saveBinary(arquivo.id, extensao, Buffer.from(conteudo, "base64"));
    return { status: 201, dados: Build(arquivo) };
  }

  // Serve o binário direto (não passa pelo wrapper JSON). Rota autenticada.
  private async Baixar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const arquivo = await this.repoArquivo.PorId(toId(req.params.id));
      if (!arquivo) throw new NotFound("Arquivo não encontrado");
      const conteudo = readBinary(arquivo.id, arquivo.extensao);
      // Anti-XSS: o navegador não deve "adivinhar" o tipo nem renderizar inline
      // — força download, mesmo para tipos como html/svg.
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `attachment; filename="${this.nomeSeguro(arquivo)}"`);
      res.type(arquivo.mimeType).send(conteudo);
    } catch (err) {
      next(err);
    }
  }

  private async MarcarPermanente(req: Request): Promise<ArquivoResponse> {
    return Build(await this.repoArquivo.MarcarPermanente(toId(req.params.id)));
  }

  // Nome de arquivo saneado para o header (sem quebra de linha/aspas → evita
  // header injection) e sempre com a extensão segura conhecida.
  private nomeSeguro(arquivo: Arquivo): string {
    const semExtensao = (arquivo.nome || "arquivo").replace(/\.[^.]+$/, "");
    const base = semExtensao.replace(/[^\w\- ]+/g, "_").slice(0, 100) || "arquivo";
    return `${base}.${arquivo.extensao}`;
  }
}
