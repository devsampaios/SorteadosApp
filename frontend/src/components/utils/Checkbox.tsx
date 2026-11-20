type CheckboxProps = {
  label?: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  description?: string;
  error?: string;
  style?: React.CSSProperties;
};

export default function Checkbox({
  label,
  name,
  checked,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  description,
  error,
  style,
}: CheckboxProps) {
  return (
    <div className="u-field" style={style}>
      <label className="u-checkbox">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={(e) => onBlur?.(e.target.checked)}
          disabled={disabled}
          required={required}
        />
        <span className="u-checkbox__box" />
        {(label || description) && (
          <span className="u-checkbox__text">
            {label && <span className="u-checkbox__label">{label}</span>}
            {description && <span className="u-checkbox__desc">{description}</span>}
          </span>
        )}
      </label>
      {error && <span className="u-field__error">{error}</span>}
    </div>
  );
}
