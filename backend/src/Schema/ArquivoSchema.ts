import { z, type ZodType } from "zod";
import type { CriarArquivoInput } from "../Model/ArquivoModel";

export const CriarArquivoSchema: ZodType<CriarArquivoInput> = z.object({
  nome: z.string().min(1, "nome é obrigatório").max(255, "nome muito longo"),
  mimeType: z.string().min(1, "mimeType é obrigatório"),
  conteudo: z.string().min(1, "conteudo é obrigatório"),
});
