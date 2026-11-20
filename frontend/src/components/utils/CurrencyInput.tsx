import { exibicaoMoeda, formatarCentavos } from "../../utils/moeda";

type CurrencyInputProps = {
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

export default function CurrencyInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "0,00",
  disabled = false,
  required = false,
  autoComplete = "off",
  error,
  style,
}: CurrencyInputProps) {
  return (
    <div className="u-field" style={style}>
      {label && (
        <label htmlFor={name} className={`u-field__label${required ? " u-field__label--required" : ""}`}>
          {label}
        </label>
      )}
      <div className="u-input-wrapper u-input-wrapper--prefix">
        <span className="u-input-adornment u-input-adornment--left" style={{ fontSize: 12, fontWeight: 600 }}>
          R$
        </span>
        <input
          id={name}
          name={name}
          type="text"
          inputMode="numeric"
          // Normaliza a exibição: um valor cru da API ("20") vira "20,00".
          value={exibicaoMoeda(value)}
          // Só dígitos, formatados como centavos: o usuário digita 1234 e vê
          // 12,34, sem precisar da vírgula. O valor emitido já vem no padrão.
          onChange={(e) => onChange(formatarCentavos(e.target.value))}
          onBlur={(e) => onBlur?.(formatarCentavos(e.target.value))}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input input--numerico${error ? " input--erro" : ""}`}
          autoComplete={autoComplete}
        />
      </div>
      <span className="u-field__error">{error ?? ""}</span>
    </div>
  );
}
