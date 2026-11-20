import { z, type ZodType } from "zod";
import { validIds } from "../Helper/Enum";
import { DiaSemana, type CriarDisciplina, type AtualizarDisciplina, type CriarAvaliacao, type DefinirNota, type DefinirTopico, type DefinirPresenca, type CriarDisciplinaUsuario } from "../Model/DisciplinaModel";

const hora = z.string().regex(/^\d{2}:\d{2}$/, "hora deve ser HH:mm");

const horarioSchema = z.object({
  diaSemana: z.coerce.number().int().refine((id) => validIds(DiaSemana).includes(id), { message: "dia inválido" }),
  horaInicio: hora,
  horaFim: hora,
});

const avaliacaoSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  data: z.coerce.date().optional(),
  pontuacaoMaxima: z.coerce.number(),
});

export const CriarDisciplinaSchema: ZodType<CriarDisciplina> = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  professor: z.string().optional(),
  sala: z.string().optional(),
  cargaHoraria: z.coerce.number().int().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  horarios: z.array(horarioSchema).optional(),
  avaliacoes: z.array(avaliacaoSchema).optional(),
});

export const AtualizarDisciplinaSchema: ZodType<AtualizarDisciplina> = z
  .object({
    nome: z.string().min(1, "nome é obrigatório").optional(),
    professor: z.string().optional(),
    sala: z.string().optional(),
    cargaHoraria: z.coerce.number().int().optional(),
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional(),
    horarios: z.array(horarioSchema).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, { message: "informe ao menos um campo" });

// Criação/edição da avaliação: a disciplina vem da rota.
export const AvaliacaoSchema: ZodType<CriarAvaliacao> = avaliacaoSchema;

// Tópico da aula (compartilhado) e presença (individual), por disciplina + data.
export const DefinirTopicoSchema: ZodType<DefinirTopico> = z.object({
  data: z.coerce.date(),
  topico: z.string(),
});
export const DefinirPresencaSchema: ZodType<DefinirPresenca> = z.object({
  data: z.coerce.date(),
  presente: z.boolean(),
});

export const DefinirNotaSchema: ZodType<DefinirNota> = z.object({
  pontuacaoObtida: z.coerce.number(),
});

// Disciplina informada inline no payload de usuário (usado pelo UsuarioSchema).
export const DisciplinaResumoSchema: ZodType<CriarDisciplinaUsuario> = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "nome é obrigatório"),
  professor: z.string().optional(),
  sala: z.string().optional(),
  cargaHoraria: z.coerce.number().int().optional(),
});

export interface SolicitarParticipacao {
  codigo: string;
}

export const SolicitarSchema: ZodType<SolicitarParticipacao> = z.object({
  codigo: z.string().trim().min(1, "informe o código da disciplina"),
});
