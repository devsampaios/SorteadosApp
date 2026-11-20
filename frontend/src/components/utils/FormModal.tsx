import { type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";

type FormModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onClose: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disableBackdropClose?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export default function FormModal({
  open,
  title,
  description,
  onSubmit,
  onClose,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  loading = false,
  disableBackdropClose = false,
  size = "md",
  children,
}: FormModalProps) {
  if (!open) return null;

  const sizeClass = size === "lg" ? "u-modal--lg" : size === "sm" ? "u-modal--sm" : "";

  return (
    <div
      className="u-modal-overlay"
      onClick={() => { if (!disableBackdropClose && !loading) onClose(); }}
    >
      <div
        className={`u-modal ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="u-modal__header">
          <div>
            <div className="u-modal__titulo">{title}</div>
            {description && <div className="u-modal__desc">{description}</div>}
          </div>
          <button
            type="button"
            className="u-modal__fechar"
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "contents" }}>
          <div className="u-modal__body">{children}</div>

          <div className="u-modal__footer">
            <button
              type="button"
              className="btn btn--secundario btn--sm"
              onClick={onClose}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="btn btn--primario btn--sm"
              disabled={loading}
            >
              {loading ? "Salvando..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
