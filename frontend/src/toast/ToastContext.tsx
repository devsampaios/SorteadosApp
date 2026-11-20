import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

type ToastType = "erro" | "info" | "sucesso";

interface ToastItem {
  id: string;
  mensagem: string;
  tipo: ToastType;
}

interface ConfirmData {
  mensagem: string;
  onConfirm: () => void;
}

interface ToastContextValue {
  showError: (mensagem: string) => void;
  showInfo: (mensagem: string) => void;
  showSuccess: (mensagem: string) => void;
  showConfirm: (mensagem: string, onConfirm: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACAO = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const contadorRef = useRef(0);
  // Erros viram um alerta central (modal), não toast. Só um por vez: enquanto
  // um está aberto, novos são ignorados — evita empilhar modais quando o mesmo
  // erro é surfado pela API e pelo catch da view.
  const [alerta, setAlerta] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmData | null>(null);

  const adicionar = useCallback((mensagem: string, tipo: ToastType) => {
    const id = `toast-${++contadorRef.current}`;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURACAO);
  }, []);

  const showError = useCallback((m: string) => setAlerta((prev) => prev ?? m), []);
  const showInfo = useCallback((m: string) => adicionar(m, "info"), [adicionar]);
  const showSuccess = useCallback((m: string) => adicionar(m, "sucesso"), [adicionar]);
  const showConfirm = useCallback((m: string, onConfirm: () => void) => setConfirmacao({ mensagem: m, onConfirm }), []);

  return (
    <ToastContext.Provider value={{ showError, showInfo, showSuccess, showConfirm }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      <AlertModal mensagem={alerta} onClose={() => setAlerta(null)} />
      <ConfirmModal dados={confirmacao} onClose={() => setConfirmacao(null)} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tipo}`}>
          <span className="toast__mensagem">{t.mensagem}</span>
          <button className="toast__fechar" onClick={() => onDismiss(t.id)} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Alerta central de erro — modal no meio da tela (reaproveita as classes .u-modal).
function AlertModal({ mensagem, onClose }: { mensagem: string | null; onClose: () => void }) {
  if (mensagem === null) return null;
  return (
    <div className="u-modal-overlay" role="alertdialog" aria-modal="true" onClick={onClose}>
      <div className="u-modal u-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="u-modal__header">
          <div>
            <div className="u-modal__titulo">Ops, algo deu errado</div>
          </div>
          <button className="u-modal__fechar" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="u-modal__body">
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--cor-texto)" }}>{mensagem}</p>
        </div>
        <div className="u-modal__footer">
          <button className="btn btn--primario btn--auto" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

// Confirmação central (Cancelar / OK) — substitui o window.confirm nativo.
function ConfirmModal({ dados, onClose }: { dados: ConfirmData | null; onClose: () => void }) {
  if (dados === null) return null;
  return (
    <div className="u-modal-overlay" role="alertdialog" aria-modal="true" onClick={onClose}>
      <div className="u-modal u-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="u-modal__header">
          <div>
            <div className="u-modal__titulo">Confirmação</div>
          </div>
          <button className="u-modal__fechar" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="u-modal__body">
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--cor-texto)" }}>{dados.mensagem}</p>
        </div>
        <div className="u-modal__footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn--secundario btn--auto" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn--primario btn--auto"
            onClick={() => {
              dados.onConfirm();
              onClose();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
