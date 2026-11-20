import { z, type ZodType } from "zod";

export interface AtualizarPerfil {
  nome?: string;
  dataNascimento?: Date;
  fotoDePerfilId?: bigint | null;
}

export const AtualizarPerfilSchema: ZodType<AtualizarPerfil> = z.object({
  nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
  dataNascimento: z.coerce.date().optional(),
  fotoDePerfilId: z.coerce.bigint().nullable().optional(),
});
