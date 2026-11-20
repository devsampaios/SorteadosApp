import { z, type ZodType } from "zod";
import type { FiltroAuditoria } from "../Model/AuditoriaModel";

export const FiltroAuditoriaSchema: ZodType<FiltroAuditoria> = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  situacao: z.string().min(1).optional(),
  acao: z.string().min(1).optional(),
  rota: z.string().min(1).optional(),
  usuario: z.string().min(1).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});
