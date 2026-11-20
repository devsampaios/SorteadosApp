import type { CSSProperties } from "react";

export const CORES_PRESET = [
  "#de673b", // coral (primária)
  "#4f7cff", // azul
  "#22c55e", // verde
  "#ef4444", // vermelho
  "#a855f7", // roxo
  "#eab308", // amarelo
  "#06b6d4", // ciano
  "#ec4899", // rosa
  "#64748b", // cinza
  "#0f172a", // navy
];

export function corDot(cor: string | null | undefined, size = 10): CSSProperties {
  return {
    display: "inline-block",
    width: size,
    height: size,
    borderRadius: "50%",
    background: cor || "var(--cor-borda)",
    flexShrink: 0,
  };
}
