import { Request, Router } from "express";
import { ZodType } from "zod";
import { Mutation, Query } from "../Helper/Handler";
import { validate } from "../Helper/Validar";
import { toId } from "../Helper/crypto";
import { NotFound } from "../Helper/AppError";
import { buildPage } from "../Helper/Paginar";
import type { Page, IReadOnlyRepository, IEntityRepository } from "../Repository/Contracts";

/**
 * Base of every controller. Only requires knowing how to register its own
 * routes. Fully custom controllers (auth, upload) extend this and wire routes
 * by hand, without carrying the generic CRUD.
 */
export abstract class CustomController {
  abstract RegisterRoutes(router: Router): void;
}

/**
 * Read-only controller: Get (paged list) and GetById.
 *
 * `ConvertToResponse` (Convert(entity) in the C# pattern) is abstract — each
 * controller decides how an entity becomes its response DTO. Single-record
 * reads go through the `Load` hook, so entities with aggregates override only
 * that method.
 */
export abstract class ReadOnlyController<TModel, TResponse> extends CustomController {
  constructor(
    protected readonly repository: IReadOnlyRepository<TModel>,
    protected readonly path: string,
  ) {
    super();
  }

  /** Convert(entity): builds the response DTO from the entity. */
  protected abstract ConvertToResponse(entity: TModel): TResponse;

  protected async Get(req: Request): Promise<Page<TResponse>> {
    const page = await this.repository.List({
      page: Number(req.query.page),
      pageSize: Number(req.query.pageSize),
    });
    const items = page.items.map((entity) => this.ConvertToResponse(entity));
    return buildPage(items, page.count, page.pageSize);
  }

  protected async GetById(req: Request): Promise<TResponse> {
    const entity = await this.Load(toId(req.params.id));
    if (!entity) {
      throw new NotFound();
    }
    return this.ConvertToResponse(entity);
  }

  /** Single-record read hook. Override to load aggregates. */
  protected Load(id: bigint): Promise<TModel | null> {
    return this.repository.GetById(id);
  }

  RegisterRoutes(router: Router): void {
    router.get(this.path, Query((req) => this.Get(req)));
    router.get(`${this.path}/:id`, Query((req) => this.GetById(req)));
  }
}

/**
 * Full CRUD controller. Follows the C# Convert pattern with the persistence
 * data (Prisma `data`) kept SEPARATE from the validated request — so Convert
 * can inject context values (unit, generated code) not present in the body.
 *
 * Generics:
 *   TModel          Prisma entity
 *   TResponse       output DTO
 *   TInsertRequest  validated POST request (Zod schema output)
 *   TUpdateRequest  validated PUT request
 *   TInsertData     `data` object of the create (what the repository writes)
 *   TUpdateData     `data` object of the update
 *
 * Pipelines (validation injected, business rules in the hooks):
 *   Post:   ValidateInsert → BeforePost → Convert(req) → repo.Insert → AfterPost
 *   Put:    ValidateUpdate → Load(current) → BeforePut → Convert(req, current) → repo.Update → AfterPut
 *   Delete: BeforeDelete → repo.Delete → AfterDelete
 */
export abstract class EntityController<
  TModel,
  TResponse,
  TInsertRequest,
  TUpdateRequest,
  TInsertData,
  TUpdateData,
> extends ReadOnlyController<TModel, TResponse> {
  constructor(
    protected readonly repository: IEntityRepository<TModel, TInsertData, TUpdateData>,
    path: string,
    protected readonly table: string,
    protected readonly insertSchema: ZodType<TInsertRequest>,
    protected readonly updateSchema: ZodType<TUpdateRequest>,
  ) {
    super(repository, path);
  }

  // Convert (C#): request → persistence data.
  /** Convert(insertRequest): builds the create `data` from the request. */
  protected abstract ConvertToInsert(request: TInsertRequest): TInsertData;
  /** Convert(putParams, old): builds the update `data` from the request and current entity. */
  protected abstract ConvertToUpdate(request: TUpdateRequest, current: TModel): TUpdateData;

  // ----- Post -----------------------------------------------------------------

  protected async Post(req: Request): Promise<{ status: number; dados: TResponse }> {
    const request = this.ValidateInsert(req.body);
    await this.BeforePost(request);
    const created = await this.repository.Insert(this.ConvertToInsert(request));
    const entity = await this.AfterPost(created, request);
    return { status: 201, dados: this.ConvertToResponse(entity) };
  }

  protected ValidateInsert(body: unknown): TInsertRequest {
    return validate(this.insertSchema, body);
  }

  /** Pre-write hook: uniqueness, permissions. Default: nothing. */
  protected async BeforePost(_request: TInsertRequest): Promise<void> {}

  /** Post-write hook: sync aggregates, reload full entity. */
  protected async AfterPost(entity: TModel, _request: TInsertRequest): Promise<TModel> {
    return entity;
  }

  // ----- Put ------------------------------------------------------------------

  protected async Put(req: Request): Promise<TResponse> {
    const id = toId(req.params.id);
    const request = this.ValidateUpdate(req.body);
    const current = await this.Load(id);
    if (!current) {
      throw new NotFound();
    }
    await this.BeforePut(id, request, current);
    const updated = await this.repository.Update(id, this.ConvertToUpdate(request, current));
    const entity = await this.AfterPut(updated, id, request);
    return this.ConvertToResponse(entity);
  }

  protected ValidateUpdate(body: unknown): TUpdateRequest {
    return validate(this.updateSchema, body);
  }

  protected async BeforePut(_id: bigint, _request: TUpdateRequest, _current: TModel): Promise<void> {}

  protected async AfterPut(entity: TModel, _id: bigint, _request: TUpdateRequest): Promise<TModel> {
    return entity;
  }

  // ----- Delete ---------------------------------------------------------------

  protected async Delete(req: Request): Promise<{ status: number; dados: { message: string } }> {
    const id = toId(req.params.id);
    await this.BeforeDelete(id);
    await this.repository.Delete(id);
    await this.AfterDelete(id);
    return { status: 200, dados: { message: "deleted" } };
  }

  protected async BeforeDelete(_id: bigint): Promise<void> {}

  protected async AfterDelete(_id: bigint): Promise<void> {}

  // ----- Routes ---------------------------------------------------------------

  RegisterRoutes(router: Router): void {
    super.RegisterRoutes(router);
    router.post(this.path, Mutation(this.table, "CREATE", (req) => this.Post(req)));
    router.put(`${this.path}/:id`, Mutation(this.table, "UPDATE", (req) => this.Put(req)));
    router.delete(`${this.path}/:id`, Mutation(this.table, "DELETE", (req) => this.Delete(req)));
  }
}
