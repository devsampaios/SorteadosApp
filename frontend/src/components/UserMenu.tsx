import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "../context/authContext";

interface UserMenuProps {
  /** Direção em que o popup abre em relação ao gatilho (default: baixo) */
  abrirPara?: "cima" | "baixo";
}

export function UserMenu({ abrirPara = "baixo" }: UserMenuProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  const iniciais = (usuario?.nome || usuario?.login || "U").slice(0, 2).toUpperCase();

  const irParaConfiguracoes = () => {
    setAberto(false);
    navigate("/configuracoes");
  };

  const irParaAdmin = () => {
    setAberto(false);
    navigate("/admin");
  };

  const sair = () => {
    setAberto(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__gatilho"
        title={usuario?.login}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="avatar">{iniciais}</span>
        <span className="user-menu__nome">{usuario?.nome || usuario?.login}</span>
      </button>
      {aberto && (
        <div className={`user-menu__popup user-menu__popup--${abrirPara}`}>
          <button type="button" className="user-menu__item" onClick={irParaConfiguracoes}>
            <Settings size={16} /> Configurações
          </button>
          <button type="button" className="user-menu__item" onClick={irParaAdmin}>
            <Shield size={16} /> Admin
          </button>
          <button type="button" className="user-menu__item user-menu__item--perigo" onClick={sair}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
