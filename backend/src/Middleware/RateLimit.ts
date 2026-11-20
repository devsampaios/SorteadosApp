import rateLimit from "express-rate-limit";

// Global request ceiling per IP — barrier against abuse/brute force. Depends on
// app.set("trust proxy", 1) behind a proxy/load balancer, otherwise the IP
// considered is the proxy's.
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições, tente novamente mais tarde" },
});

// Tighter ceiling for sensitive routes (login/session).
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas, tente novamente mais tarde" },
});
