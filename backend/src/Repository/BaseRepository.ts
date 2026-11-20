import { toSkipTake } from "../Helper/Paginar";
import { Db } from "../Infra/Db";
import type {
  Page,
  PageOptions,
  IReadOnlyRepository,
  IEntityRepository,
  ReadDelegate,
  WriteDelegate,
} from "./Contracts";

/**
 * Read-only base: List (paged) + GetById over a Prisma delegate.
 *
 * The subclass only provides `delegate()`, usually `this.db.<table>`. `this.db`
 * is the ambient client (the current transaction inside a UnitOfWork, or the
 * `prisma` singleton otherwise), so the repository joins the request's
 * transaction without receiving `tx` as a parameter.
 */
export abstract class ReadOnlyRepository<TModel> implements IReadOnlyRepository<TModel> {
  protected get db() {
    return Db();
  }

  protected abstract delegate(): ReadDelegate<TModel>;

  async List(options: PageOptions): Promise<Page<TModel>> {
    const { skip, take, pageSize } = toSkipTake(options);
    const delegate = this.delegate();
    const [items, count] = await Promise.all([
      delegate.findMany({ skip, take, orderBy: { id: "desc" } }),
      delegate.count(),
    ]);
    return { items, count, pageSize };
  }

  GetById(id: bigint): Promise<TModel | null> {
    return this.delegate().findUnique({ where: { id } });
  }
}

/**
 * Full CRUD base: adds Insert/Update/Delete. Insert/Update receive the
 * persistence data (Prisma `data`) already built by the controller's Convert.
 */
export abstract class BaseRepository<TModel, TInsertData, TUpdateData>
  extends ReadOnlyRepository<TModel>
  implements IEntityRepository<TModel, TInsertData, TUpdateData>
{
  protected abstract delegate(): WriteDelegate<TModel, TInsertData, TUpdateData>;

  Insert(data: TInsertData): Promise<TModel> {
    return this.delegate().create({ data });
  }

  Update(id: bigint, data: TUpdateData): Promise<TModel> {
    return this.delegate().update({ where: { id }, data });
  }

  async Delete(id: bigint): Promise<void> {
    await this.delegate().delete({ where: { id } });
  }
}
