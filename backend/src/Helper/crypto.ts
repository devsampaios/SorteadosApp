import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from "crypto";
// Lê o config.json direto (e não ../config) para não criar import circular:
// o config usa decrypt() daqui para abrir a senha do banco.
import configJson from "../../config.json";

const CODE_ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789";

export function generateCode(length: number): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function toId(value: string | number | bigint): bigint {
  try {
    return BigInt(value);
  } catch {
    throw Object.assign(new Error("id inválido"), { statusCode: 400 });
  }
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function deterministicIv(key: Buffer, plaintext: string): Buffer {
  return createHmac("sha256", key).update(plaintext).digest().subarray(0, IV_LENGTH);
}

export function encryptDeterministic(plaintext: string, secret?: string): string {
  const key = deriveKey(secret ?? configJson.crypto.secret);
  const iv = deterministicIv(key, plaintext);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decrypt(blob: string, secret?: string): string {
  const key = deriveKey(secret ?? configJson.crypto.secret);
  const data = Buffer.from(blob, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
