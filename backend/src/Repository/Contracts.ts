import type { PageOptions, Page } from "../Helper/Paginar";

export type { Page, PageOptions };

/** Read-only repository: list (paged) + get by id. */
export interface IReadOnlyRepository<TModel> {
  List(options: PageOptions): Promise<Page<TModel>>;
  GetById(id: bigint): Promise<TModel | null>;
}

/** Full CRUD repository. Insert/Update receive the persistence data (Prisma `data`). */
export interface IEntityRepository<TModel, TInsertData, TUpdateData>
  extends IReadOnlyRepository<TModel> {
  Insert(data: TInsertData): Promise<TModel>;
  Update(id: bigint, data: TUpdateData): Promise<TModel>;
  Delete(id: bigint): Promise<void>;
}

/** Shape of a Prisma read delegate (findMany/findUnique/count). */
export interface ReadDelegate<TModel> {
  findMany(args: { skip: number; take: number; orderBy: { id: "desc" } }): Promise<TModel[]>;
  findUnique(args: { where: { id: bigint } }): Promise<TModel | null>;
  count(): Promise<number>;
}

/** Shape of a Prisma write delegate (adds create/update/delete). */
export interface WriteDelegate<TModel, TInsertData, TUpdateData> extends ReadDelegate<TModel> {
  create(args: { data: TInsertData }): Promise<TModel>;
  update(args: { where: { id: bigint }; data: TUpdateData }): Promise<TModel>;
  delete(args: { where: { id: bigint } }): Promise<TModel>;
}
