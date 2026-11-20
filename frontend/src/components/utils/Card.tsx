import type { ReactNode, CSSProperties } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  children: ReactNode;
  hover?: boolean;
  padding?: CardPadding;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
};

const paddingMap: Record<CardPadding, string> = {
  none: "0",
  sm:   "12px",
  md:   "20px",
  lg:   "32px",
};

export default function Card({
  children,
  hover = true,
  padding = "md",
  onClick,
  style,
  className,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card${className ? ` ${className}` : ""}`}
      style={{
        padding: paddingMap[padding],
        cursor: onClick ? "pointer" : undefined,
        transition: hover ? "box-shadow 0.2s, border-color 0.2s" : undefined,
        ...style,
      }}
      onMouseEnter={hover && onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cor-primaria)";
      } : undefined}
      onMouseLeave={hover && onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cor-borda)";
      } : undefined}
    >
      {children}
    </div>
  );
}
