import cors, { CorsOptions } from "cors";
import { config } from "../config";

const allowedOrigins = config.cors.origins;
const allowAll = allowedOrigins.includes("*");

const options: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowAll || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error(`Origem não permitida pelo CORS: ${origin}`), { statusCode: 403 }));
  },
  credentials: !allowAll,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};

export const corsMiddleware = cors(options);
