import { forwardRef, useState, type CSSProperties } from "react";
import "./assets/ColorInput.css";

interface ColorInputProps {
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  name?: string;
  id?: string;
}

const COR_PADRAO = "#f0b429";

// Seletor de cor: swatch nativo + campo hex. Controlado (value) ou não
// (defaultValue). O input[type=color] exige um hex válido; o campo hex deixa
// digitar/colar livremente e só propaga.
const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(function ColorInput(
  { defaultValue, value, onChange, disabled, className, style, name, id },
  ref
) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState<string>(defaultValue ?? "");
  const atual = controlado ? (value ?? "") : interno;

  const propagar = (v: string) => {
    if (!controlado) setInterno(v);
    onChange?.(v);
  };

  const ehHexValido = /^#[0-9a-fA-F]{6}$/.test(atual);

  return (
    <div className={`ci-color${className ? ` ${className}` : ""}`} style={style}>
      <input
        ref={ref}
        id={id}
        name={name}
        type="color"
        className="ci-color__swatch"
        disabled={disabled}
        value={ehHexValido ? atual : COR_PADRAO}
        onChange={(e) => propagar(e.target.value)}
      />
      <input
        type="text"
        className="ci-color__hex"
        disabled={disabled}
        placeholder="#000000"
        maxLength={7}
        value={atual}
        onChange={(e) => propagar(e.target.value)}
      />
    </div>
  );
});

export default ColorInput;
