import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import api from "../../service/Api";
import { Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AsyncSelectSearchProps<T> {
  onSelect: (item: T) => void;
  onClose: () => void;
  textoInicial: string;
}

export type AsyncSelectProps<T> = {
  label?: string;
  name?: string;
  value: T | null;
  onChange: (item: T | null) => void;
  /** Retorna a URL de busca com o texto digitado */
  getFilterUrl: (texto: string) => string;
  /** Texto exibido para o item */
  getLabel: (item: T) => string;
  /** Chave única do item */
  getKey: (item: T) => string | number;
  /** Modal de busca completo — recebe onSelect, onClose e texto inicial */
  searchModal?: (props: AsyncSelectSearchProps<T>) => ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  minChars?: number;
  debounceMs?: number;
  style?: React.CSSProperties;
};

export interface AsyncSelectRef {
  clear: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function AsyncSelectInner<T>(
  {
    label,
    name,
    value,
    onChange,
    getFilterUrl,
    getLabel,
    getKey,
    searchModal,
    placeholder = "Digite para buscar...",
    required = false,
    disabled = false,
    error,
    minChars = 3,
    debounceMs = 300,
    style,
  }: AsyncSelectProps<T>,
  ref: React.Ref<AsyncSelectRef>,
) {
  const [inputText, setInputText] = useState("");
  const [preview, setPreview] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscandoRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputId = name ?? "async-select";

  // Sincroniza o input com o valor selecionado externamente
  useEffect(() => {
    setInputText(value ? getLabel(value) : "");
    setPreview(null);
  }, [value]);

  // Fecha preview ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPreview(null);
        if (!value) setInputText("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  const buscar = (texto: string) => {
    if (texto.length < minChars) {
      setPreview(null);
      return;
    }
    if (buscandoRef.current) return;

    buscandoRef.current = true;
    setLoading(true);

    api
      .getAll<{ items: T[] }>(getFilterUrl(texto))
      .then((result) => {
        setPreview(result.items ?? []);
      })
      .catch(() => setPreview([]))
      .finally(() => {
        buscandoRef.current = false;
        setLoading(false);
      });
  };

  const selecionar = (item: T) => {
    onChange(item);
    setPreview(null);
    setModalAberto(false);
  };

  const limpar = () => {
    onChange(null);
    setInputText("");
    setPreview(null);
  };

  useImperativeHandle(ref, () => ({ clear: limpar }));

  const itemSelecionado = value !== null;

  return (
    <div className="u-field" style={style}>
      {label && (
        <label
          htmlFor={inputId}
          className={`u-field__label${required ? " u-field__label--required" : ""}`}
        >
          {label}
        </label>
      )}

      <div className="u-aselect" ref={wrapperRef}>
        <div className="u-aselect__row">
          <input
            id={inputId}
            name={name}
            type="text"
            autoComplete="off"
            className={`input u-aselect__input${error ? " input--erro" : ""}`}
            placeholder={placeholder}
            value={inputText}
            disabled={disabled || itemSelecionado}
            readOnly={itemSelecionado}
            onChange={(e) => {
              const texto = e.target.value;
              setInputText(texto);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => buscar(texto), debounceMs);
            }}
          />

          {!itemSelecionado && searchModal && (
            <button
              type="button"
              className="u-aselect__btn"
              disabled={disabled}
              onClick={() => setModalAberto(true)}
              title="Abrir busca"
            >
              <Search size={16} />
            </button>
          )}

          {itemSelecionado && (
            <button
              type="button"
              className="u-aselect__btn u-aselect__btn--clear"
              disabled={disabled}
              onClick={limpar}
              title="Limpar seleção"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Preview dropdown (busca inline) */}
        {preview !== null && !itemSelecionado && (
          <div className="u-fselect__dropdown">
            {loading && (
              <div className="u-fselect__vazio">Buscando...</div>
            )}
            {!loading && preview.length === 0 && (
              <div className="u-fselect__vazio">Nenhum resultado</div>
            )}
            {!loading &&
              preview.map((item) => (
                <button
                  key={getKey(item)}
                  type="button"
                  className="u-fselect__item"
                  onClick={() => selecionar(item)}
                >
                  {getLabel(item)}
                </button>
              ))}
          </div>
        )}
      </div>

      <span className="u-field__error">{error ?? ""}</span>

      {/* Modal de busca completo */}
      {modalAberto && searchModal && (
        <div
          className="u-modal-overlay"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="u-modal u-modal--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="u-modal__header">
              <div className="u-modal__titulo">Buscar {label ?? ""}</div>
              <button
                type="button"
                className="u-modal__fechar"
                onClick={() => setModalAberto(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="u-modal__body">
              {searchModal({
                onSelect: selecionar,
                onClose: () => setModalAberto(false),
                textoInicial: inputText,
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// forwardRef não suporta generics diretamente — cast necessário
const AsyncSelect = forwardRef(AsyncSelectInner) as <T>(
  props: AsyncSelectProps<T> & { ref?: React.Ref<AsyncSelectRef> },
) => ReactNode;

export default AsyncSelect;
