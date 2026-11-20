import { describe } from "../Helper/Enum";
import { decifrar } from "../Helper/CampoCifrado";
import { TipoConteudo, type ConteudoComAutor, type ConteudoResponse } from "../Model/ConteudoModel";

export function Build(conteudo: ConteudoComAutor): ConteudoResponse {
  return {
    id: conteudo.id.toString(),
    tipo: describe(TipoConteudo, conteudo.tipo),
    texto: decifrar(conteudo.texto),
    link: decifrar(conteudo.link),
    arquivoId: conteudo.arquivoId ? conteudo.arquivoId.toString() : null,
    usuarioId: conteudo.usuarioId.toString(),
    autorNome: decifrar(conteudo.autorNome),
    autorEmail: conteudo.autorEmail,
    criadoEm: conteudo.criadoEm.toISOString(),
  };
}
