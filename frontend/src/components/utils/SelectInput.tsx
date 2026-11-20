type Option = { value: string; label: string; disabled?: boolean; grupo?: string };

// Preserva a ordem de entrada, agrupando opções consecutivas do mesmo grupo em <optgroup>.
function agruparOpcoes(options: Option[]): { grupo?: string; opcoes: Option[] }[] {
  const entradas: { grupo?: string; opcoes: Option[] }[] = [];
  for (const opt of options) {
    const ultima = entradas[entradas.length - 1];
    if (ultima && ultima.grupo === opt.grupo) ultima.opcoes.push(opt);
    else entradas.push({ grupo: opt.grupo, opcoes: [opt] });
  }
  return entradas;
}

type SelectInputProps = {
  label?: string;
  name: string;
  value: string;
  options: Option[];
  placeholderOption?: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  style?: React.CSSProperties;
};

export default function SelectInput({
  label,
  name,
  value,
  options,
  placeholderOption,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: SelectInputProps) {
  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <div className="u-select-wrapper">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={`input${error ? " input--erro" : ""}`}
        >
          {placeholderOption && (
            <option value="" disabled>
              {placeholderOption}
            </option>
          )}
          {agruparOpcoes(options).map((entrada) =>
            entrada.grupo ? (
              <optgroup key={entrada.grupo} label={entrada.grupo}>
                {entrada.opcoes.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              entrada.opcoes.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            )
          )}
        </select>
      </div>
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
