import type { Arquivo } from "@prisma/client";
import { CustomRepository } from "./CustomRepository";
import type { CriarArquivo, IArquivoRepository } from "../Model/ArquivoModel";

export class ArquivoRepository extends CustomRepository implements IArquivoRepository {
  Criar(dados: CriarArquivo): Promise<Arquivo> {
    return this.db.arquivo.create({ data: dados });
  }

  PorId(id: bigint): Promise<Arquivo | null> {
    return this.db.arquivo.findUnique({ where: { id } });
  }

  PorUsuario(usuarioId: bigint): Promise<Arquivo[]> {
    return this.db.arquivo.findMany({ where: { usuarioId }, orderBy: { id: "desc" } });
  }

  MarcarPermanente(id: bigint): Promise<Arquivo> {
    return this.db.arquivo.update({ where: { id }, data: { temporario: false } });
  }
}
