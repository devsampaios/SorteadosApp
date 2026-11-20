import { z, type ZodType } from "zod";
import type { IdTokenInput, RegistroInput } from "../Model/AuthModel";

export const SessaoSchema: ZodType<IdTokenInput> = z.object({
  idToken: z.string().min(1, "idToken é obrigatório"),
});

export const RegistroSchema: ZodType<RegistroInput> = z.object({
  idToken: z.string().min(1, "idToken é obrigatório"),
  nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
});
