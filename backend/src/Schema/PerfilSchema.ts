import { z, type ZodType } from "zod";

export interface AtualizarPerfil {
  nome?: string;
}

export const AtualizarPerfilSchema: ZodType<AtualizarPerfil> = z.object({
  nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
});
