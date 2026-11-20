type EmailInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  style?: React.CSSProperties;
};

export default function EmailInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "email@dominio.com",
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: EmailInputProps) {
  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <div className="u-input-wrapper u-input-wrapper--prefix">
        <span className="u-input-adornment u-input-adornment--left">@</span>
        <input
          id={name}
          name={name}
          type="email"
          inputMode="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input${error ? " input--erro" : ""}`}
          autoComplete={autoComplete}
        />
      </div>
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
