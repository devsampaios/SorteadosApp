import type { Usuario } from "@prisma/client";
import type { EnumMap, EnumItem } from "../Helper/Enum";
import type { IEntityRepository } from "../Repository/Contracts";
import { SearchableEntityModel } from "./BaseModel";

export const SituacaoUsuario: EnumMap = { 1: "ATIVO", 2: "BLOQUEADO", 3: "EXCLUIDO" };

// ----- Request DTOs (entrada já validada pelo schema) -----
// A senha só entra na criação (texto puro, o controller grava o hash). Depois
// ela é trocada pelo script criptografar-senha + update direto no banco.
export interface CriarUsuario {
  login: string;
  senha: string;
  nome?: string;
  situacao?: number;
}

export interface AtualizarUsuario {
  login?: string;
  nome?: string;
  situacao?: number;
}

// ----- Dados de persistência (saída do Convert → `data` do Prisma) -----
export interface CriarUsuarioData {
  login: string;
  senha: string;
  nome?: string;
  situacao?: number;
}

export type AtualizarUsuarioData = AtualizarUsuario;

// ----- Response (nunca expõe a senha) -----
export interface UsuarioResponse {
  id: string;
  login: string;
  nome: string | null;
  situacao: EnumItem | null;
}

export interface IUsuarioRepository extends IEntityRepository<Usuario, CriarUsuarioData, AtualizarUsuarioData> {
  PorLogin(login: string): Promise<Usuario | null>;
}

/**
 * Modelo de domínio pesquisável. Pronto para gerar o valor da busca cifrada,
 * mas HOJE não é persistido — a tabela `usuario` ainda não tem a coluna
 * `searchable` (precisa de migration). Serve como exemplo do getSearchableText().
 */
export class UsuarioModel extends SearchableEntityModel {
  id: bigint;
  private readonly login: string;
  private readonly nome?: string | null;

  constructor(dados: { id?: bigint; login: string; nome?: string | null }) {
    super();
    this.id = dados.id ?? 0n;
    this.login = dados.login;
    this.nome = dados.nome;
  }

  get entityName(): string {
    return "Usuario";
  }

  protected get searchableScope(): string {
    return "usuario";
  }

  protected searchableFields(): Array<string | null | undefined> {
    return [this.login, this.nome];
  }
}
