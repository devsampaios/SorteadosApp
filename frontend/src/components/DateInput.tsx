import { forwardRef, type CSSProperties } from "react";
import "./assets/DateInput.css";

interface DateInputProps {
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  name?: string;
  id?: string;
}

// input[type=date] no visual dos demais campos. O valor é sempre yyyy-MM-dd.
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { defaultValue, value, onChange, disabled, className, style, name, id },
  ref
) {
  const controlado = value !== undefined;
  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="date"
      className={`ci-date${className ? ` ${className}` : ""}`}
      style={style}
      disabled={disabled}
      {...(controlado ? { value } : { defaultValue: defaultValue ?? "" })}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
});

export default DateInput;
