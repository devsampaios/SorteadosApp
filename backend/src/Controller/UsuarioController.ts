import { Request } from "express";
import { EntityController } from "./EntityController";
import { Conflict, NotFound } from "../Helper/AppError";
import { toId } from "../Helper/crypto";
import { Build } from "../Dto/UsuarioDto";
import { CriarUsuarioSchema, AtualizarUsuarioSchema } from "../Schema/UsuarioSchema";
import { cifrar } from "../Helper/CampoCifrado";
import type {
  CriarUsuario,
  AtualizarUsuario,
  CriarUsuarioData,
  AtualizarUsuarioData,
  UsuarioResponse,
  UsuarioComDisciplinas,
  IUsuarioRepository,
} from "../Model/UsuarioModel";

export class UsuarioController extends EntityController<
  UsuarioComDisciplinas,
  UsuarioResponse,
  CriarUsuario,
  AtualizarUsuario,
  CriarUsuarioData,
  AtualizarUsuarioData
> {
  constructor(private readonly repoUsuario: IUsuarioRepository) {
    super(repoUsuario, "/usuarios", "usuario", CriarUsuarioSchema, AtualizarUsuarioSchema);
  }

  // Convert(entity) → resposta com as disciplinas do agregado.
  protected ConvertToResponse(entity: UsuarioComDisciplinas): UsuarioResponse {
    return Build(entity);
  }

  // Convert(insertRequest) → `data` do create (sem as disciplinas, tratadas no AfterPost).
  protected ConvertToInsert(request: CriarUsuario): CriarUsuarioData {
    const { disciplinas, ...data } = request;
    return { ...data, nome: cifrar(data.nome) ?? undefined };
  }

  // Convert(putParams, old) → `data` do update (sem as disciplinas).
  protected ConvertToUpdate(request: AtualizarUsuario, _current: UsuarioComDisciplinas): AtualizarUsuarioData {
    const { disciplinas, ...data } = request;
    if (data.nome !== undefined) data.nome = cifrar(data.nome) ?? undefined;
    return data;
  }

  // Agregado: leitura de 1 registro sempre com as disciplinas.
  protected Load(id: bigint): Promise<UsuarioComDisciplinas | null> {
    return this.repoUsuario.PorIdComDisciplinas(id);
  }

  // Post do agregado: valida e-mail, cria e sincroniza as disciplinas direto.
  protected async Post(req: Request): Promise<{ status: number; dados: UsuarioResponse }> {
    const request = this.ValidateInsert(req.body);
    await this.validarUsoDoEmail(request.email);
    const created = await this.repository.Insert(this.ConvertToInsert(request));
    if (request.disciplinas) {
      await this.repoUsuario.SincronizarDisciplinas(created.id, request.disciplinas);
    }
    const entity = (await this.repoUsuario.PorIdComDisciplinas(created.id)) ?? created;
    return { status: 201, dados: this.ConvertToResponse(entity) };
  }

  // Put do agregado: valida e-mail, atualiza e sincroniza as disciplinas direto.
  protected async Put(req: Request): Promise<UsuarioResponse> {
    const id = toId(req.params.id);
    const request = this.ValidateUpdate(req.body);
    const current = await this.Load(id);
    if (!current) {
      throw new NotFound();
    }
    if (request.email) {
      await this.validarUsoDoEmail(request.email, id);
    }
    const updated = await this.repository.Update(id, this.ConvertToUpdate(request, current));
    if (request.disciplinas !== undefined) {
      await this.repoUsuario.SincronizarDisciplinas(id, request.disciplinas);
    }
    const entity = (await this.repoUsuario.PorIdComDisciplinas(id)) ?? updated;
    return this.ConvertToResponse(entity);
  }

  private async validarUsoDoEmail(email: string, ignorarId?: bigint): Promise<void> {
    const existente = await this.repoUsuario.PorEmail(email);
    if (existente && existente.id !== ignorarId) {
      throw new Conflict(`E-mail já cadastrado: ${email}`);
    }
  }
}
