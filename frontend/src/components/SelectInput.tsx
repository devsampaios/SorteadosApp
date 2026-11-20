import { forwardRef, type CSSProperties } from "react";
import "./assets/SelectInput.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  defaultValue?: string | number | null;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  name?: string;
  id?: string;
}

// Select no mesmo visual do TextInput. Controlado (value) ou não (defaultValue).
const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { defaultValue, value, onChange, options, placeholder, disabled, className, style, name, id },
  ref
) {
  const controlado = value !== undefined;
  return (
    <select
      ref={ref}
      id={id}
      name={name}
      className={`ci-select${className ? ` ${className}` : ""}`}
      style={style}
      disabled={disabled}
      {...(controlado ? { value } : { defaultValue: defaultValue != null ? String(defaultValue) : "" })}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((op) => (
        <option key={op.value} value={op.value}>
          {op.label}
        </option>
      ))}
    </select>
  );
});

export default SelectInput;
