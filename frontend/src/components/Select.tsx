import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import api from "../service/Api";
import "./assets/Select.css";

/** Handlers entregues ao formularioPadrao — casam com a prop `select` do Form. */
export interface SelectHandlers<T> {
  aoSelecionar: (item: T, flag?: boolean) => void;
  aoCancelar: () => void;
}

interface SelectProps<T> {
  /** Valor não-controlado (padrão do modelo de Form). */
  defaultValue?: T | null;
  /** Valor controlado (opcional). */
  value?: T | null;
  onSelect: (item: T | null) => void;
  /** Texto exibido do item. */
  getDescription: (item: T) => string;
  /** Chave única do item. */
  getKeyValue: (item: T) => string | number;
  /** Lista estática. Alternativa a getFilterUrl. */
  options?: T[];
  /** URL de busca assíncrona com o texto digitado. Retorna { items }. */
  getFilterUrl?: (texto: string) => string;
  /** Sub-view em modo seleção, aberta num modal (ex.: cadastrar na hora). */
  formularioPadrao?: (select: SelectHandlers<T>) => ReactNode;
  /** Placeholder quando vazio. */
  nullText?: string;
  /** Permite limpar a seleção (botão X). */
  allowEmpty?: boolean;
  /** Não mostra o dropdown inline de resultados (só o modal). */
  noDropDown?: boolean;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Select<T>({
  defaultValue = null,
  value,
  onSelect,
  getDescription,
  getKeyValue,
  options,
  getFilterUrl,
  formularioPadrao,
  nullText = "Selecione",
  allowEmpty = false,
  noDropDown = false,
  disabled = false,
  minChars = 1,
  debounceMs = 300,
  className,
  style,
}: SelectProps<T>) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState<T | null>(defaultValue);
  const atual = controlado ? (value ?? null) : interno;

  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [resultados, setResultados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const estatico = Array.isArray(options);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selecionar = (item: T | null) => {
    if (!controlado) setInterno(item);
    onSelect(item);
    setTexto("");
    setAberto(false);
    setModalAberto(false);
  };

  const buscar = (t: string) => {
    if (!getFilterUrl || t.trim().length < minChars) {
      setResultados([]);
      return;
    }
    setCarregando(true);
    api
      .getAll<{ items: T[] }>(getFilterUrl(t))
      .then((r) => setResultados(r?.items ?? []))
      .catch(() => setResultados([]))
      .finally(() => setCarregando(false));
  };

  const aoDigitar = (t: string) => {
    setTexto(t);
    setAberto(true);
    if (estatico) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(t), debounceMs);
  };

  // Lista exibida no dropdown: options filtradas por texto, ou resultados async.
  const lista = useMemo<T[]>(() => {
    if (estatico) {
      const t = texto.trim().toLowerCase();
      return !t ? options! : options!.filter((o) => getDescription(o).toLowerCase().includes(t));
    }
    return resultados;
  }, [estatico, options, resultados, texto, getDescription]);

  const modal =
    modalAberto && formularioPadrao ? (
      <div className="u-modal-overlay" onClick={() => setModalAberto(false)}>
        <div className="u-modal u-modal--lg" onClick={(e) => e.stopPropagation()}>
          <div className="ci-sel__modal-body">
            {formularioPadrao({
              aoSelecionar: (item) => selecionar(item),
              aoCancelar: () => setModalAberto(false),
            })}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={`ci-sel${className ? ` ${className}` : ""}`} style={style} ref={wrapperRef}>
      {atual ? (
        <div className="ci-sel__value">
          <span className="ci-sel__value-texto">{getDescription(atual)}</span>
          {allowEmpty && !disabled && (
            <button type="button" className="ci-sel__btn" title="Limpar" onClick={() => selecionar(null)}>
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="ci-sel__control">
          <input
            type="text"
            className="ci-sel__input"
            autoComplete="off"
            placeholder={nullText}
            value={texto}
            disabled={disabled}
            onChange={(e) => aoDigitar(e.target.value)}
            onFocus={() => {
              if (estatico) setAberto(true);
            }}
          />
          {estatico && (
            <button
              type="button"
              className="ci-sel__btn"
              disabled={disabled}
              title="Abrir"
              onClick={() => setAberto((a) => !a)}
            >
              <ChevronDown size={16} />
            </button>
          )}
          {formularioPadrao && (
            <button
              type="button"
              className="ci-sel__btn"
              disabled={disabled}
              title="Buscar/cadastrar"
              onClick={() => setModalAberto(true)}
            >
              <Search size={16} />
            </button>
          )}
        </div>
      )}

      {aberto && !atual && !noDropDown && (
        <div className="ci-sel__dropdown">
          {carregando && <div className="ci-sel__vazio">Buscando...</div>}
          {!carregando && lista.length === 0 && <div className="ci-sel__vazio">Nenhum resultado</div>}
          {!carregando &&
            lista.map((item) => (
              <button
                key={getKeyValue(item)}
                type="button"
                className="ci-sel__item"
                onClick={() => selecionar(item)}
              >
                {getDescription(item)}
              </button>
            ))}
        </div>
      )}

      {modal}
    </div>
  );
}
