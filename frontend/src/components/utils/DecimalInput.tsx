type DecimalInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  style?: React.CSSProperties;
};

const normalize = (raw: string) => raw.replace(/[^\d,.-]/g, "").replace(",", ".");

export default function DecimalInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "0,00",
  min,
  max,
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: DecimalInputProps) {
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
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(normalize(e.target.value))}
        onBlur={(e) => onBlur?.(normalize(e.target.value))}
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
