import { Express, Router } from "express";
import { authenticate, requireMaster } from "./Middleware/Autenticacao";
import { UsuarioRepository } from "./Repository/UsuarioRepository";
import { UsuarioController } from "./Controller/UsuarioController";
import { AuditoriaRepository } from "./Repository/AuditoriaRepository";
import { AuditoriaController } from "./Controller/AuditoriaController";
import { ArquivoRepository } from "./Repository/ArquivoRepository";
import { ArquivoController } from "./Controller/ArquivoController";
import { AuthController } from "./Controller/AuthController";
import { DisciplinaRepository } from "./Repository/DisciplinaRepository";
import { DisciplinaController } from "./Controller/DisciplinaController";
import { ConteudoRepository } from "./Repository/ConteudoRepository";
import { ConteudoController } from "./Controller/ConteudoController";
import { PerfilController } from "./Controller/PerfilController";

// Monta as rotas em três camadas de acesso, instanciando repositório +
// controller na hora (sem Container). O repositório de usuário é compartilhado
// entre auth, perfil e o CRUD admin.
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
  const disciplinaRepository = new DisciplinaRepository();
  new DisciplinaController(disciplinaRepository).RegisterRoutes(privado);
  new ConteudoController(new ConteudoRepository(), disciplinaRepository).RegisterRoutes(privado);
  new ArquivoController(new ArquivoRepository()).RegisterRoutes(privado);

  // Admin: dentro do privado, só perfil master.
  const admin = Router();
  admin.use(requireMaster);
  new UsuarioController(usuarioRepository).RegisterRoutes(admin);
  new AuditoriaController(new AuditoriaRepository()).RegisterRoutes(admin);
  privado.use(admin);

  app.use(privado);
}
