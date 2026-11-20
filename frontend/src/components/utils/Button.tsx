import type { ReactNode, MouseEvent } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md";

type ButtonProps = {
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  fieldLabel?: string;
  style?: React.CSSProperties;
};

const variantMap: Record<Variant, string> = {
  primary:   "btn--primario",
  secondary: "btn--secundario",
  ghost:     "btn--ghost",
  danger:    "btn--danger",
  success:   "btn--success",
};

export default function Button({
  label,
  onClick,
  type = "button",
  variant = "primary",
  size,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = true,
  fieldLabel,
  style,
}: ButtonProps) {
  const classes = [
    "btn",
    variantMap[variant],
    size === "sm" ? "btn--sm" : "",
    !fullWidth ? "btn--auto" : "",
  ].filter(Boolean).join(" ");

  const btn = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      style={style}
    >
      {loading ? (
        <span className="u-table__spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
      ) : iconLeft}
      <span>{loading ? "Carregando..." : label}</span>
      {!loading && iconRight}
    </button>
  );

  if (fieldLabel) {
    return (
      <div className="u-field">
        <span className="u-field__label">{fieldLabel}</span>
        {btn}
      </div>
    );
  }

  return btn;
}
