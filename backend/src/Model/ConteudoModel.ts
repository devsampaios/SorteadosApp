import type { Conteudo } from "@prisma/client";
import type { EnumMap, EnumItem } from "../Helper/Enum";

// Tipo do conteúdo postado na disciplina.
export const TipoConteudo: EnumMap = { 1: "TEXTO", 2: "LINK", 3: "IMAGEM" };
export const TIPO_TEXTO = 1;
export const TIPO_LINK = 2;
export const TIPO_IMAGEM = 3;

// Payload de criação (a disciplina e o autor vêm da rota/contexto).
export interface CriarConteudo {
  tipo: number;
  texto?: string;
  link?: string;
  arquivoId?: bigint;
}

// Conteúdo com os dados do autor (join manual em `usuario`).
export interface ConteudoComAutor extends Conteudo {
  autorNome: string | null;
  autorEmail: string;
}

export interface ConteudoResponse {
  id: string;
  tipo: EnumItem | null;
  texto: string | null;
  link: string | null;
  arquivoId: string | null;
  usuarioId: string;
  autorNome: string | null;
  autorEmail: string;
  criadoEm: string;
}

export interface IConteudoRepository {
  ListarPorDisciplina(disciplinaId: bigint): Promise<ConteudoComAutor[]>;
  Criar(disciplinaId: bigint, usuarioId: bigint, dados: CriarConteudo): Promise<ConteudoComAutor>;
  PorId(id: bigint): Promise<Conteudo | null>;
  Excluir(id: bigint): Promise<void>;
}
