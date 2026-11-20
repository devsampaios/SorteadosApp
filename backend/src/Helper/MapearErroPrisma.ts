import { Prisma } from "@prisma/client";
import { Conflict, NotFound, DomainError } from "./AppError";

export function mapPrismaError(err: unknown): DomainError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Unique constraint violation.
      case "P2002": {
        const target = (err.meta?.target as string[] | undefined)?.join(", ");
        return new Conflict(target ? `Já existe registro com ${target}` : "Registro duplicado");
      }
      // Foreign key violation.
      case "P2003":
        return new Conflict("Operação viola uma referência existente");
      // Required record not found (update/delete on a missing id).
      case "P2025":
        return new NotFound("Recurso não encontrado");
      default:
        return null;
    }
  }
  return null;
}
