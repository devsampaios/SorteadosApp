import { CORES_PRESET } from "../../utils/cores";

type ColorPickerProps = {
  label?: string;
  value: string;
  onChange: (cor: string) => void;
  style?: React.CSSProperties;
};

export default function ColorPicker({ label, value, onChange, style }: ColorPickerProps) {
  return (
    <div className="u-field" style={style}>
      {label && <label className="u-field__label">{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CORES_PRESET.map((cor) => (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(cor)}
            aria-label={`Selecionar cor ${cor}`}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: cor,
              border: value === cor ? "2px solid var(--cor-texto)" : "2px solid transparent",
              outline: value === cor ? `2px solid ${cor}` : "none",
              outlineOffset: 1,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
