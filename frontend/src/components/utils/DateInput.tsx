type DateInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  style?: React.CSSProperties;
};

export default function DateInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: DateInputProps) {
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
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className={`input${error ? " input--erro" : ""}`}
      />
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
