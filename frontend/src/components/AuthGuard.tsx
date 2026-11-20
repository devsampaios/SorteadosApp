import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

export function AuthGuard() {
  const { autenticado } = useAuth();
  return autenticado ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * Guarda das telas de administração. Só esconde a UI — quem realmente barra é
 * o masterMiddleware no backend, então uma sessão adulterada no localStorage
 * não abre nada.
 */
export function MasterGuard() {
  const { autenticado, ehMaster } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return ehMaster ? <Outlet /> : <Navigate to="/" replace />;
}

export function PublicGuard() {
  const { autenticado } = useAuth();
  return autenticado ? <Navigate to="/" replace /> : <Outlet />;
}
