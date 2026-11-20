import { z, type ZodType } from "zod";
import { validIds, type EnumMap } from "../Helper/Enum";
import { PerfilUsuario, SituacaoUsuario, type CriarUsuario, type AtualizarUsuario } from "../Model/UsuarioModel";
import { DisciplinaResumoSchema } from "./DisciplinaSchema";

const enumId = (mapa: EnumMap) =>
  z.coerce.number().int().refine((id) => validIds(mapa).includes(id), { message: "valor inválido" });

export const CriarUsuarioSchema: ZodType<CriarUsuario> = z.object({
  firebaseUid: z.string().min(1, "firebaseUid é obrigatório"),
  email: z.string().email("email inválido"),
  nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
  dataNascimento: z.coerce.date().optional(),
  perfil: enumId(PerfilUsuario).optional(),
  situacao: enumId(SituacaoUsuario).optional(),
  disciplinas: z.array(DisciplinaResumoSchema).optional(),
});

export const AtualizarUsuarioSchema: ZodType<AtualizarUsuario> = z
  .object({
    email: z.string().email("email inválido").optional(),
    nome: z.string().min(2, "nome deve ter no mínimo 2 caracteres").optional(),
    dataNascimento: z.coerce.date().optional(),
    perfil: enumId(PerfilUsuario).optional(),
    situacao: enumId(SituacaoUsuario).optional(),
    disciplinas: z.array(DisciplinaResumoSchema).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, { message: "informe ao menos um campo" });
