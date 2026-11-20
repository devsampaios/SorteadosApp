type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
  loading?: boolean;
  label?: string;
  placeholder?: string;
  primaryLabel?: string;
  clearLabel?: string;
  hideClear?: boolean;
  style?: React.CSSProperties;
};

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  loading = false,
  label = "Buscar",
  placeholder = "Digite para buscar...",
  primaryLabel = "Pesquisar",
  clearLabel = "Limpar",
  hideClear = false,
  style,
}: SearchBarProps) {
  return (
    <div className="u-searchbar" style={style}>
      {label && <span className="u-searchbar__label">{label}</span>}
      <div className="u-searchbar__row">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder={placeholder}
          autoComplete="off"
          className="input"
          disabled={loading}
        />
        {!hideClear && onClear && (
          <button
            type="button"
            className="btn btn--secundario btn--sm"
            onClick={onClear}
            disabled={loading}
            style={{ whiteSpace: "nowrap" }}
          >
            {clearLabel}
          </button>
        )}
        <button
          type="button"
          className="btn btn--primario btn--sm"
          onClick={onSearch}
          disabled={loading}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "Buscando..." : primaryLabel}
        </button>
      </div>
    </div>
  );
}
