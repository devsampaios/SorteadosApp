import { EXTENSAO_POR_MIME } from "./MimeMap";

// Extensão padrão quando o mime é desconhecido (ou vazio).
const EXTENSAO_PADRAO = "bin";

/**
 * Extensão de disco segura para um mime. Resolve pelo mapa e SANEIA para
 * [a-z0-9] — assim nenhuma extensão (nem valores estranhos do mapa) pode conter
 * separadores de caminho ou `..`, fechando path traversal na origem.
 */
export function extensaoDe(mime: string): string {
  const bruta = EXTENSAO_POR_MIME[mime.trim().toLowerCase()] ?? EXTENSAO_PADRAO;
  const segura = bruta.toLowerCase().replace(/[^a-z0-9]/g, "");
  return segura || EXTENSAO_PADRAO;
}
