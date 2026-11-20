import { z, type ZodType } from "zod";
import { validIds, type EnumMap } from "../Helper/Enum";
import { SituacaoUsuario, type CriarUsuario, type AtualizarUsuario } from "../Model/UsuarioModel";

const enumId = (mapa: EnumMap) =>
  z.coerce.number().int().refine((id) => validIds(mapa).includes(id), { message: "valor inválido" });

const login = z.string().trim().min(3, "login deve ter no mínimo 3 caracteres");

export const CriarUsuarioSchema: ZodType<CriarUsuario> = z.object({
  login,
  senha: z.string().min(6, "senha deve ter no mínimo 6 caracteres"),
  nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
  situacao: enumId(SituacaoUsuario).optional(),
});

export const AtualizarUsuarioSchema: ZodType<AtualizarUsuario> = z
  .object({
    login: login.optional(),
    nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
      situacao: enumId(SituacaoUsuario).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, { message: "informe ao menos um campo" });
