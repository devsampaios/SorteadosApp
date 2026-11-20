import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "app:auth";

export interface UsuarioAutenticado {
  usuarioId: string;
  login: string;
  nome: string | null;
  token: string;
}

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  autenticado: boolean;
  login: (dados: UsuarioAutenticado) => void;
  logout: () => void;
  atualizarToken: (token: string) => void;
  atualizarUsuario: (patch: Partial<Pick<UsuarioAutenticado, "nome">>) => void;
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

  const atualizarUsuario = useCallback((patch: Partial<Pick<UsuarioAutenticado, "nome">>) => {
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
