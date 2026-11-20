import { Request } from "express";
import { validate } from "../Helper/Validar";
import { buildPage, type Page } from "../Helper/Paginar";
import { ReadOnlyController } from "./EntityController";
import type { Auditoria } from "@prisma/client";
import { Build } from "../Dto/AuditoriaDto";
import { FiltroAuditoriaSchema } from "../Schema/AuditoriaSchema";
import type { AuditoriaResponse, IAuditoriaRepository } from "../Model/AuditoriaModel";

export class AuditoriaController extends ReadOnlyController<Auditoria, AuditoriaResponse> {
  constructor(private readonly repoAuditoria: IAuditoriaRepository) {
    super(repoAuditoria, "/auditorias");
  }

  protected ConvertToResponse(entity: Auditoria): AuditoriaResponse {
    return Build(entity);
  }

  protected async Get(req: Request): Promise<Page<AuditoriaResponse>> {
    const filtro = validate(FiltroAuditoriaSchema, req.query);
    const pagina = await this.repoAuditoria.ListarPorFiltro(filtro);
    return buildPage(pagina.items.map(Build), pagina.count, pagina.pageSize);
  }
}
