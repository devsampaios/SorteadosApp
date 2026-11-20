import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

export function AuthGuard() {
  const { autenticado } = useAuth();
  return autenticado ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicGuard() {
  const { autenticado } = useAuth();
  return autenticado ? <Navigate to="/" replace /> : <Outlet />;
}
