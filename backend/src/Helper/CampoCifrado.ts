import { encryptDeterministic, decrypt } from "./crypto";

export function cifrar(texto: string | null | undefined): string | null {
  if (!texto) return null;
  return encryptDeterministic(texto);
}

// Decifra um valor cifrado. Valores legados em texto puro (gravados antes da
// cifra) não têm auth tag válido: o decrypt lança e devolvemos o original.
export function decifrar(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    return decrypt(blob);
  } catch {
    return blob;
  }
}
