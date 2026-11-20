import { Db } from "../Infra/Db";

// Base for repositories that don't fit the generic delegate CRUD (bespoke
// queries). Only exposes the ambient client `db` (the current transaction or
// the prisma singleton).
export abstract class CustomRepository {
  protected get db() {
    return Db();
  }
}
