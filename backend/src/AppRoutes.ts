import { Express, Router } from "express";
import { authenticate } from "./Middleware/Autenticacao";
import { UsuarioRepository } from "./Repository/UsuarioRepository";
import { UsuarioController } from "./Controller/UsuarioController";
import { AuditoriaRepository } from "./Repository/AuditoriaRepository";
import { AuditoriaController } from "./Controller/AuditoriaController";
import { ArquivoRepository } from "./Repository/ArquivoRepository";
import { ArquivoController } from "./Controller/ArquivoController";
import { AuthController } from "./Controller/AuthController";
import { PerfilController } from "./Controller/PerfilController";

// Monta as rotas em três camadas de acesso, instanciando repositório +
// controller na hora (sem Container). O repositório de usuário é compartilhado
// entre auth, perfil (dados do próprio usuário) e o CRUD de usuários.
export function registrarRotas(app: Express): void {
  const usuarioRepository = new UsuarioRepository();

  // Público: sem autenticação.
  const publico = Router();
  new AuthController(usuarioRepository).RegisterRoutes(publico);
  app.use(publico);

  // Privado: exige token válido.
  const privado = Router();
  privado.use(authenticate);
  new PerfilController(usuarioRepository).RegisterRoutes(privado);
  new ArquivoController(new ArquivoRepository()).RegisterRoutes(privado);
  // Perfil único: todo usuário autenticado acessa tudo, inclusive usuários e auditoria.
  new UsuarioController(usuarioRepository).RegisterRoutes(privado);
  new AuditoriaController(new AuditoriaRepository()).RegisterRoutes(privado);

  app.use(privado);
}
