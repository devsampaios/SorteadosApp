import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "../context/authContext";
import api from "../service/Api";
import { urlDoArquivo } from "../service/arquivos";

interface UserMenuProps {
  /** Direção em que o popup abre em relação ao gatilho (default: baixo) */
  abrirPara?: "cima" | "baixo";
}

export function UserMenu({ abrirPara = "baixo" }: UserMenuProps) {
  const { usuario, logout, atualizarUsuario, ehMaster } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlAtivaRef = useRef<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  // Sessão antiga pode não ter o fotoArquivoId (login não devolve foto). Busca
  // o perfil uma vez e guarda no contexto — daí pra frente vem do storage.
  const fotoArquivoId = usuario?.fotoArquivoId;
  useEffect(() => {
    if (!usuario || fotoArquivoId !== undefined) return;
    api.get<{ fotoArquivoId: string | null }>("/perfil", false, false, false)
      .then((p) => atualizarUsuario({ fotoArquivoId: p.fotoArquivoId }))
      .catch(() => atualizarUsuario({ fotoArquivoId: null }));
  }, [usuario, fotoArquivoId, atualizarUsuario]);

  // Carrega a imagem (blob autenticado) quando o id muda; revoga o URL antigo.
  useEffect(() => {
    const trocar = (url: string | null) => {
      if (urlAtivaRef.current) URL.revokeObjectURL(urlAtivaRef.current);
      urlAtivaRef.current = url;
      setFotoUrl(url);
    };
    if (!fotoArquivoId) {
      trocar(null);
      return;
    }
    let cancelado = false;
    urlDoArquivo(fotoArquivoId)
      .then((url) => (cancelado ? URL.revokeObjectURL(url) : trocar(url)))
      .catch(() => trocar(null));
    return () => {
      cancelado = true;
    };
  }, [fotoArquivoId]);

  // Revoga o blob ao desmontar.
  useEffect(() => () => {
    if (urlAtivaRef.current) URL.revokeObjectURL(urlAtivaRef.current);
  }, []);

  const iniciais = usuario?.email?.slice(0, 2).toUpperCase() ?? "U";

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
        title={usuario?.email}
        onClick={() => setAberto((a) => !a)}
      >
        <span
          className="avatar"
          style={fotoUrl ? { padding: 0, overflow: "hidden", background: "transparent" } : undefined}
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            iniciais
          )}
        </span>
        <span className="user-menu__nome">{usuario?.nome || usuario?.email}</span>
      </button>
      {aberto && (
        <div className={`user-menu__popup user-menu__popup--${abrirPara}`}>
          <button type="button" className="user-menu__item" onClick={irParaConfiguracoes}>
            <Settings size={16} /> Configurações
          </button>
          {ehMaster && (
            <button type="button" className="user-menu__item" onClick={irParaAdmin}>
              <Shield size={16} /> Admin
            </button>
          )}
          <button type="button" className="user-menu__item user-menu__item--perigo" onClick={sair}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
