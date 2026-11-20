import type { Arquivo } from "@prisma/client";
import type { ArquivoResponse } from "../Model/ArquivoModel";

export function Build(arquivo: Arquivo): ArquivoResponse {
  return {
    id: arquivo.id.toString(),
    nome: arquivo.nome,
    extensao: arquivo.extensao,
    mimeType: arquivo.mimeType,
    temporario: arquivo.temporario,
    usuarioId: arquivo.usuarioId ? arquivo.usuarioId.toString() : null,
    criadoEm: arquivo.criadoEm.toISOString(),
  };
}
