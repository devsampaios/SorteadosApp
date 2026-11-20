import configJson from "../../config.json";
import { decrypt } from "../Helper/crypto";

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface AppConfig {
  app: { port: number; env: string };
  cors: { origins: string[] };
  uploads: { dir: string };
  database: DbConfig;
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  jwt: { secret: string };
  crypto: { secret: string };
  jobs: boolean;
}

const configBruta = configJson as AppConfig;

export const config: AppConfig = {
  ...configBruta,
  cors: { origins: configBruta.cors?.origins ?? ["*"] },
  uploads: {
    dir: configBruta.uploads?.dir,
  },
  database: {
    ...configBruta.database,
    password: configBruta.database.password
      ? decrypt(configBruta.database.password, configBruta.crypto.secret)
      : "",
  },
  jobs: configBruta.jobs ?? true ,
};

export function buildDatabaseUrl(db: DbConfig): string {
  return `postgresql://${db.user}:${encodeURIComponent(db.password)}@${db.host}:${db.port}/${db.database}`;
}
