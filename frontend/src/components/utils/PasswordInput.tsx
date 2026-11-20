import { useState } from "react";

type PasswordInputProps = {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  showToggle?: boolean;
  error?: string;
  style?: React.CSSProperties;
};

export default function PasswordInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "••••••••",
  disabled = false,
  required = false,
  autoComplete = "off",
  showToggle = true,
  error,
  style,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <div className="u-input-wrapper" style={{ position: "relative" }}>
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input${error ? " input--erro" : ""}`}
          style={showToggle ? { paddingRight: 72 } : undefined}
          autoComplete={autoComplete}
        />
        {showToggle && (
          <button
            type="button"
            className="u-pwd-toggle"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
          >
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
