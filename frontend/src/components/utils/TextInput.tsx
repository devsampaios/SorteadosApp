type TextInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  style?: React.CSSProperties;
};

export default function TextInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  disabled = false,
  required = false,
  autoComplete = "off",
  maxLength,
  error,
  style,
}: TextInputProps) {
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
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        className={`input${error ? " input--erro" : ""}`}
        autoComplete={autoComplete}
      />
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
