import { z, type ZodType } from "zod";
import type { LoginInput } from "../Model/AuthModel";

export const LoginSchema: ZodType<LoginInput> = z.object({
  login: z.string().trim().min(1, "login é obrigatório"),
  senha: z.string().min(1, "senha é obrigatória"),
});
