import type { Arquivo } from "@prisma/client";

export interface CriarArquivo {
  nome: string;
  extensao: string;
  mimeType: string;
  usuarioId?: bigint;
}

// Entrada do upload (corpo validado): só o que o cliente pode informar. A
// `extensao` é derivada do `mimeType` no servidor e o dono vem do contexto —
// nenhum dos dois é confiável vindo do corpo, por isso ficam fora daqui.
export interface CriarArquivoInput {
  nome: string;
  mimeType: string;
  conteudo: string;
}

export interface ArquivoResponse {
  id: string;
  nome: string;
  extensao: string;
  mimeType: string;
  temporario: boolean;
  usuarioId: string | null;
  criadoEm: string;
}

export interface IArquivoRepository {
  Criar(dados: CriarArquivo): Promise<Arquivo>;
  PorId(id: bigint): Promise<Arquivo | null>;
  PorUsuario(usuarioId: bigint): Promise<Arquivo[]>;
  MarcarPermanente(id: bigint): Promise<Arquivo>;
}
