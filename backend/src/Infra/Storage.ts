import fs from "fs";
import path from "path";
import { config } from "../config";

// Binary storage on disk (config.uploads.dir). Metadata lives in the `arquivo`
// table; here only the content, named as <id>.<extension>.

function ensureDir(): string {
  const dir = config.uploads.dir;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function diskName(id: bigint, extension: string): string {
  // Defesa em profundidade: mesmo que a extensão já venha validada da allowlist,
  // recusamos qualquer coisa fora de [a-z0-9] — impede `../`, separadores e afins.
  if (!/^[a-z0-9]+$/i.test(extension)) {
    throw Object.assign(new Error("extensão de arquivo inválida"), { statusCode: 400 });
  }
  return `${id.toString()}.${extension}`;
}

export function filePath(id: bigint, extension: string): string {
  const dir = config.uploads.dir;
  const alvo = path.resolve(dir, diskName(id, extension));
  // Garante que o caminho final não escapou do diretório de uploads.
  const raiz = path.resolve(dir) + path.sep;
  if (!alvo.startsWith(raiz)) {
    throw Object.assign(new Error("caminho de arquivo inválido"), { statusCode: 400 });
  }
  return alvo;
}

export function saveBinary(id: bigint, extension: string, content: Buffer): void {
  ensureDir();
  fs.writeFileSync(filePath(id, extension), content);
}

export function readBinary(id: bigint, extension: string): Buffer {
  return fs.readFileSync(filePath(id, extension));
}
