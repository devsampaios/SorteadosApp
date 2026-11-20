type HorasInputProps = {
  label?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  style?: React.CSSProperties;
};

// Formata os dígitos como HH:mm — o usuário digita só números e o ":" entra sozinho.
function formatarHora(raw: string): string {
  const digitos = raw.replace(/\D/g, "").slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

export default function HorasInput({ label, name, value, onChange, required = false, style }: HorasInputProps) {
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
        type="text"
        inputMode="numeric"
        placeholder="00:00"
        value={value}
        onChange={(e) => onChange(formatarHora(e.target.value))}
        maxLength={5}
        className="input"
        autoComplete="off"
      />
      <span className="u-field__error" />
    </div>
  );
}
