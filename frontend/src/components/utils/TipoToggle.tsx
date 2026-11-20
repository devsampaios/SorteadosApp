import { ArrowDown, ArrowUp } from "lucide-react";

type TipoToggleProps = {
  label?: string;
  /** "ENTRADA" ou "SAIDA" */
  value: string;
  onChange: (value: string) => void;
  /** Rótulos alternativos (ex.: "A receber" / "A pagar" nas dívidas) */
  rotulos?: { entrada: string; saida: string };
};

// Seletor de entrada/saída em dois botões coloridos (verde/vermelho), no lugar
// de um dropdown — bem mais intuitivo que escolher "Tipo" numa lista.
export default function TipoToggle({ label, value, onChange, rotulos }: TipoToggleProps) {
  const entrada = rotulos?.entrada ?? "Entrada";
  const saida = rotulos?.saida ?? "Saída";
  return (
    <div className="u-field">
      {label && <label className="u-field__label">{label}</label>}
      <div className="tipo-toggle">
        <button
          type="button"
          className={`tipo-toggle__op tipo-toggle__op--entrada${value === "ENTRADA" ? " tipo-toggle__op--ativo" : ""}`}
          onClick={() => onChange("ENTRADA")}
          aria-pressed={value === "ENTRADA"}
        >
          <ArrowUp size={16} /> {entrada}
        </button>
        <button
          type="button"
          className={`tipo-toggle__op tipo-toggle__op--saida${value === "SAIDA" ? " tipo-toggle__op--ativo" : ""}`}
          onClick={() => onChange("SAIDA")}
          aria-pressed={value === "SAIDA"}
        >
          <ArrowDown size={16} /> {saida}
        </button>
      </div>
    </div>
  );
}
