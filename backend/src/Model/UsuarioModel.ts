import type { Usuario, Disciplina } from "@prisma/client";
import type { EnumMap, EnumItem } from "../Helper/Enum";
import type { IEntityRepository } from "../Repository/Contracts";
import { SearchableEntityModel } from "./BaseModel";
// Tipos de disciplina reaproveitados da entidade Disciplina.
import type { CriarDisciplinaUsuario, DisciplinaResumo } from "./DisciplinaModel";

export const PerfilUsuario: EnumMap = { 1: "MASTER", 2: "USUARIO" };
export const SituacaoUsuario: EnumMap = { 1: "ATIVO", 2: "BLOQUEADO", 3: "EXCLUIDO" };

export type { CriarDisciplinaUsuario, DisciplinaResumo };

// ----- Request DTOs (entrada já validada pelo schema) -----
export interface CriarUsuario {
  firebaseUid: string;
  email: string;
  nome?: string;
  dataNascimento?: Date;
  perfil?: number;
  situacao?: number;
  disciplinas?: CriarDisciplinaUsuario[];
}

export interface AtualizarUsuario {
  email?: string;
  nome?: string;
  dataNascimento?: Date;
  perfil?: number;
  situacao?: number;
  fotoDePerfilId?: bigint | null;
  disciplinas?: CriarDisciplinaUsuario[];
}

// ----- Dados de persistência (saída do Convert → `data` do Prisma, sem disciplinas) -----
export interface CriarUsuarioData {
  firebaseUid: string;
  email: string;
  nome?: string;
  dataNascimento?: Date;
  perfil?: number;
  situacao?: number;
}

export interface AtualizarUsuarioData {
  email?: string;
  nome?: string;
  dataNascimento?: Date;
  perfil?: number;
  situacao?: number;
  fotoDePerfilId?: bigint | null;
}

// ----- Response -----
export interface UsuarioResponse {
  id: string;
  email: string;
  nome: string | null;
  dataNascimento: string | null;
  perfil: EnumItem | null;
  situacao: EnumItem | null;
  disciplinas: DisciplinaResumo[];
}

// Entidade + agregado de disciplinas (opcional: List traz sem, PorId traz com).
export type UsuarioComDisciplinas = Usuario & { disciplinas?: Disciplina[] };

export interface IUsuarioRepository
  extends IEntityRepository<UsuarioComDisciplinas, CriarUsuarioData, AtualizarUsuarioData> {
  PorEmail(email: string): Promise<Usuario | null>;
  PorFirebaseUid(firebaseUid: string): Promise<Usuario | null>;
  PorIdComDisciplinas(id: bigint): Promise<UsuarioComDisciplinas | null>;
  SincronizarDisciplinas(usuarioId: bigint, disciplinas: CriarDisciplinaUsuario[]): Promise<void>;
}

/**
 * Modelo de domínio pesquisável. Pronto para gerar o valor da busca cifrada,
 * mas HOJE não é persistido — a tabela `usuario` ainda não tem a coluna
 * `searchable` (precisa de migration). Serve como exemplo do getSearchableText().
 */
export class UsuarioModel extends SearchableEntityModel {
  id: bigint;
  private readonly email: string;
  private readonly nome?: string | null;

  constructor(dados: { id?: bigint; email: string; nome?: string | null }) {
    super();
    this.id = dados.id ?? 0n;
    this.email = dados.email;
    this.nome = dados.nome;
  }

  get entityName(): string {
    return "Usuario";
  }

  protected get searchableScope(): string {
    return "usuario";
  }

  protected searchableFields(): Array<string | null | undefined> {
    return [this.email, this.nome];
  }
}
