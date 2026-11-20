import type { CSSProperties } from "react";

interface FillerProps {
  height?: number | string;
  width?: number | string;
  marginTop?: number | string;
  marginBottom?: number | string;
  color?: string;
}

export default function Filler({ height = 0, width = "100%", marginTop = 0, marginBottom = 0, color }: FillerProps) {
  const style: CSSProperties = { marginTop, marginBottom, borderColor: color, width, height };
  return <div style={style} />;
}
