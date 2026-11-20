import { config } from "../config";
import { encryptDeterministic } from "./crypto";

const ACCENTS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const SearchableHelper = {
  Build(text: string, scope: string): string {
    const normalized = normalize(text);
    if (!normalized) {
      return "";
    }
    return encryptDeterministic(`${scope}:${normalized}`, config.crypto.secret);
  },
};
