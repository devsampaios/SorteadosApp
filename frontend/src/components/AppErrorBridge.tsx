import { useEffect } from "react";
import { signOut } from "firebase/auth";
import api from "../service/Api";
import { firebaseAuth } from "../firebase";
import { useAuth } from "../context/authContext";
import { useToast } from "../toast/ToastContext";
import { registrarMensagens, limparMensagens } from "./Messages";

export default function AppErrorBridge() {
  const { logout } = useAuth();
  const { showError, showSuccess, showInfo, showConfirm } = useToast();

  useEffect(() => {
    api.tratarErro = (mensagem) => showError(mensagem);
    api.tratarErroAuth = () => {
      signOut(firebaseAuth).catch(() => {});
      logout();
    };
    registrarMensagens({ showError, showSuccess, showInfo, showConfirm });
    return () => {
      api.tratarErro = undefined;
      api.tratarErroAuth = undefined;
      limparMensagens();
    };
  }, [logout, showError, showSuccess, showInfo, showConfirm]);

  return null;
}
