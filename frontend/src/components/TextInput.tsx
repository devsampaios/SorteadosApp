import { forwardRef, type CSSProperties } from "react";
import "./assets/TextInput.css";

interface TextInputProps {
  /** Uso não-controlado (padrão do novo modelo de Form). */
  defaultValue?: string | number | null;
  /** Uso controlado (opcional). */
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "number" | "time";
  disabled?: boolean;
  maxLength?: number;
  error?: boolean;
  className?: string;
  style?: CSSProperties;
  autoComplete?: string;
  name?: string;
  id?: string;
}

// Campo de texto. Aceita ref (para autofoco) e funciona tanto controlado
// (value) quanto não-controlado (defaultValue).
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { defaultValue, value, onChange, onBlur, placeholder, type = "text", disabled, maxLength, error, className, style, autoComplete = "off", name, id },
  ref
) {
  const controlado = value !== undefined;
  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type={type}
      className={`ci-input${error ? " ci-input--erro" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      autoComplete={autoComplete}
      {...(controlado ? { value } : { defaultValue: defaultValue ?? "" })}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={(e) => onBlur?.(e.target.value)}
    />
  );
});

export default TextInput;
