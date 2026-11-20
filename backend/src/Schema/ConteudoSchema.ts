import { z, type ZodType } from "zod";
import { validIds } from "../Helper/Enum";
import { TipoConteudo, TIPO_TEXTO, TIPO_LINK, TIPO_IMAGEM, type CriarConteudo } from "../Model/ConteudoModel";

export const CriarConteudoSchema: ZodType<CriarConteudo> = z
  .object({
    tipo: z.coerce.number().int().refine((id) => validIds(TipoConteudo).includes(id), { message: "tipo inválido" }),
    texto: z.string().optional(),
    link: z.string().optional(),
    arquivoId: z.coerce.bigint().optional(),
  })
  .refine(
    (dados) => {
      if (dados.tipo === TIPO_TEXTO) return !!dados.texto && dados.texto.trim() !== "";
      if (dados.tipo === TIPO_LINK) return !!dados.link && dados.link.trim() !== "";
      if (dados.tipo === TIPO_IMAGEM) return dados.arquivoId != null;
      return false;
    },
    { message: "conteúdo obrigatório para o tipo informado" },
  );
