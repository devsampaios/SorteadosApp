type IntegerInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  style?: React.CSSProperties;
};

const somenteDigitos = (raw: string) => raw.replace(/\D/g, "");

export default function IntegerInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: IntegerInputProps) {
  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(somenteDigitos(e.target.value))}
        onBlur={(e) => onBlur?.(somenteDigitos(e.target.value))}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className={`input input--numerico${error ? " input--erro" : ""}`}
        autoComplete={autoComplete}
      />
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
