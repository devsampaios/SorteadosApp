import { SearchableHelper } from "../Helper/SearchableHelper";

/** Minimum contract of every entity: id + readable entity name (audit, logs). */
export interface IEntity {
  id: bigint;
  readonly entityName: string;
}

/** Entity that takes part in the encrypted search. */
export interface ISearchableEntity extends IEntity {
  searchable: string; // persisted column (encrypted value)
  getSearchableText(): string; // recomputes the column value
}

/** Base class for domain entities. */
export abstract class BaseModel implements IEntity {
  abstract id: bigint;

  /** Readable entity name — used in audit/logs. */
  abstract get entityName(): string;
}

/**
 * Base for searchable entities (C# ISearchableEntity equivalent). The subclass
 * declares the scope and which fields feed the search; `getSearchableText()`
 * concatenates, normalizes and encrypts through SearchableHelper, returning the
 * value ready to store in the `searchable` column.
 *
 * Usage in the controller's Convert:
 *   const model = new TagModel(request);
 *   data.searchable = model.getSearchableText();
 */
export abstract class SearchableEntityModel extends BaseModel implements ISearchableEntity {
  searchable = "";

  /** Search namespace — avoids collisions between different entities. */
  protected abstract get searchableScope(): string;

  /** Fields that compose the search text, in the desired order. */
  protected abstract searchableFields(): Array<string | null | undefined>;

  getSearchableText(): string {
    const text = this.searchableFields()
      .filter((field): field is string => Boolean(field))
      .join(" ");
    return SearchableHelper.Build(text, this.searchableScope);
  }
}
