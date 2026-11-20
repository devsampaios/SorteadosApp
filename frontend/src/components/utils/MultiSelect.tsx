import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

type Option = { value: string; label: string; disabled?: boolean; grupo?: string; cor?: string };

type MultiSelectProps = {
  label?: string;
  name: string;
  /** Valores selecionados. Lista vazia = nenhum filtro aplicado. */
  values: string[];
  options: Option[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  filterPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  /** Esconde o campo de busca — útil quando são poucas opções */
  esconderBusca?: boolean;
  error?: string;
  style?: React.CSSProperties;
};

// Agrupa opções consecutivas do mesmo grupo, preservando a ordem de entrada
// (mesma convenção do SelectInput).
function agrupar(options: Option[]): { grupo?: string; opcoes: Option[] }[] {
  const entradas: { grupo?: string; opcoes: Option[] }[] = [];
  for (const opt of options) {
    const ultima = entradas[entradas.length - 1];
    if (ultima && ultima.grupo === opt.grupo) ultima.opcoes.push(opt);
    else entradas.push({ grupo: opt.grupo, opcoes: [opt] });
  }
  return entradas;
}

export default function MultiSelect({
  label,
  name,
  values,
  options,
  onChange,
  placeholder = "Todos",
  filterPlaceholder = "Filtrar...",
  disabled = false,
  required = false,
  loading = false,
  esconderBusca = false,
  error,
  style,
}: MultiSelectProps) {
  const [filtro, setFiltro] = useState("");
  const [aberto, setAberto] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora e zera a busca, pra reabrir sempre com a lista cheia.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
        setFiltro("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return options;
    return options.filter((o) => o.label.toLowerCase().includes(termo));
  }, [options, filtro]);

  const selecionadas = useMemo(
    () => options.filter((o) => values.includes(o.value)),
    [options, values]
  );

  const alternar = (opt: Option) => {
    if (opt.disabled) return;
    onChange(values.includes(opt.value) ? values.filter((v) => v !== opt.value) : [...values, opt.value]);
  };

  // Resumo no botão: até 2 nomes; daí em diante vira contagem, pra não estourar
  // a largura do campo.
  const resumo = () => {
    if (loading) return "Carregando...";
    if (selecionadas.length === 0) return placeholder;
    if (selecionadas.length <= 2) return selecionadas.map((o) => o.label).join(", ");
    return `${selecionadas.length} selecionados`;
  };

  const vazio = selecionadas.length === 0;

  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}

      <div className="u-fselect" ref={wrapperRef}>
        <button
          id={name}
          type="button"
          disabled={disabled || loading}
          onClick={() => setAberto((a) => !a)}
          className={`input${error ? " input--erro" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            textAlign: "left",
            cursor: disabled || loading ? "not-allowed" : "pointer",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: vazio ? "var(--cor-texto-suave)" : "var(--cor-texto)",
            }}
          >
            {resumo()}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!vazio && (
              // <span> em vez de <button>: botão dentro de botão é HTML inválido
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar seleção"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange([]); } }}
                style={{ fontSize: 12, color: "var(--cor-texto-suave)", cursor: "pointer", display: "inline-flex" }}
              >
                <X size={16} />
              </span>
            )}
            <ChevronDown size={10} color="var(--cor-texto-suave)" />
          </span>
        </button>

        {aberto && !disabled && !loading && (
          <div className="u-fselect__dropdown">
            {!esconderBusca && options.length > 6 && (
              <div style={{ padding: 8, borderBottom: "1px solid var(--cor-borda)" }}>
                <input
                  type="text"
                  className="input"
                  autoComplete="off"
                  placeholder={filterPlaceholder}
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  style={{ height: 34, padding: "4px 10px", fontSize: 13 }}
                />
              </div>
            )}

            {filtradas.length === 0 ? (
              <div className="u-fselect__vazio">Nenhum resultado</div>
            ) : (
              agrupar(filtradas).map((entrada, i) => (
                <div key={entrada.grupo ?? `g${i}`}>
                  {entrada.grupo && (
                    <div
                      style={{
                        padding: "6px 12px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        color: "var(--cor-texto-suave)",
                        background: "var(--cor-fundo-input)",
                      }}
                    >
                      {entrada.grupo}
                    </div>
                  )}
                  {entrada.opcoes.map((opt) => {
                    const marcada = values.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => alternar(opt)}
                        className={`u-fselect__item${marcada ? " u-fselect__item--selected" : ""}`}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 14,
                            height: 14,
                            flexShrink: 0,
                            borderRadius: 3,
                            border: `1px solid ${marcada ? "var(--cor-primaria)" : "var(--cor-borda)"}`,
                            background: marcada ? "var(--cor-primaria)" : "transparent",
                            color: "#fff",
                            fontSize: 9,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {marcada && <Check size={16} />}
                        </span>
                        {opt.cor && (
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.cor, flexShrink: 0 }} />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
