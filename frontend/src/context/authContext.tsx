import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { TipoPerfil } from "../types/dominio";

const STORAGE_KEY = "app:auth";

export interface UsuarioAutenticado {
  usuarioId: string;
  email: string;
  nome: string | null;
  token: string;
  /** MASTER usa o app normalmente E acessa a administração */
  perfil: TipoPerfil;
  /** Id do arquivo da foto de perfil; undefined = ainda não carregado */
  fotoArquivoId?: string | null;
}

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  autenticado: boolean;
  /** Atalho pra liberar UI administrativa */
  ehMaster: boolean;
  login: (dados: UsuarioAutenticado) => void;
  logout: () => void;
  atualizarToken: (token: string) => void;
  atualizarUsuario: (patch: Partial<Pick<UsuarioAutenticado, "nome" | "email" | "fotoArquivoId">>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarDoStorage(): UsuarioAutenticado | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UsuarioAutenticado;
  } catch {
    return null;
  }
}

function salvarNoStorage(dados: UsuarioAutenticado | null): void {
  if (dados) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(carregarDoStorage);

  useEffect(() => {
    salvarNoStorage(usuario);
  }, [usuario]);

  const login = useCallback((dados: UsuarioAutenticado) => {
    setUsuario(dados);
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
  }, []);

  const atualizarToken = useCallback((token: string) => {
    setUsuario((prev) => {
      if (!prev) return prev;
      return { ...prev, token };
    });
  }, []);

  const atualizarUsuario = useCallback((patch: Partial<Pick<UsuarioAutenticado, "nome" | "email" | "fotoArquivoId">>) => {
    setUsuario((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        autenticado: usuario !== null,
        // Sessão antiga (gravada antes do perfil existir) cai em USUARIO — o
        // backend é quem barra de verdade, isso aqui só esconde a UI.
        ehMaster: usuario?.perfil === "MASTER",
        login,
        logout,
        atualizarToken,
        atualizarUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
