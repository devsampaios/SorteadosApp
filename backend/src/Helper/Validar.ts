import { ZodSchema } from "zod";
import { ValidationError } from "./AppError";

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      campo: i.path.join("."),
      mensagem: i.message,
    }));
    throw new ValidationError("Dados inválidos", details);
  }
  return result.data;
}
