import { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string; disabled?: boolean; search?: string };

type FilterSelectProps = {
  label?: string;
  name: string;
  value: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  filterPlaceholder?: string;
  error?: string;
  style?: React.CSSProperties;
};

export default function FilterSelect({
  label,
  name,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  required = false,
  loading = false,
  filterPlaceholder = "Filtrar...",
  error,
  style,
}: FilterSelectProps) {
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sincroniza o texto do filtro com o label do valor selecionado
  useEffect(() => {
    const selected = options.find((o) => o.value === value);
    setFilter(selected?.label ?? "");
  }, [value, options]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        // restaura label se não selecionou nada novo
        const selected = options.find((o) => o.value === value);
        setFilter(selected?.label ?? "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, options]);

  const filtered = useMemo(() => {
    const term = filter.toLowerCase();
    return options.filter((o) =>
      (o.search ?? o.label).toLowerCase().includes(term)
    );
  }, [options, filter]);

  const select = (opt: Option) => {
    if (opt.disabled) return;
    setFilter(opt.label);
    setOpen(false);
    onChange(opt.value);
  };

  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <div className="u-fselect" ref={wrapperRef}>
        <input
          id={name}
          type="text"
          value={loading ? "Carregando..." : filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={filterPlaceholder ?? placeholder}
          disabled={disabled || loading}
          autoComplete="off"
          className={`input${error ? " input--erro" : ""}`}
        />
        {open && !disabled && !loading && (
          <div className="u-fselect__dropdown">
            {filtered.length === 0 ? (
              <div className="u-fselect__vazio">Nenhum resultado</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => select(opt)}
                  className={`u-fselect__item${opt.value === value ? " u-fselect__item--selected" : ""}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
