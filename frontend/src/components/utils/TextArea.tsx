type TextAreaProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  error?: string;
  style?: React.CSSProperties;
};

export default function TextArea({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  disabled = false,
  required = false,
  maxLength,
  error,
  style,
}: TextAreaProps) {
  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        className={`input${error ? " input--erro" : ""}`}
        style={{ resize: "vertical", minHeight: 80, lineHeight: 1.5 }}
      />
      {maxLength && (
        <span style={{ fontSize: 11, color: "var(--cor-texto-suave)", textAlign: "right" }}>
          {value.length}/{maxLength}
        </span>
      )}
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
