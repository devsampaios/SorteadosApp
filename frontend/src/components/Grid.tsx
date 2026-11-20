import type { CSSProperties, ReactNode } from "react";
import "./assets/Grid.css";

// Wrappers finos sobre o grid do Bootstrap (classes row / col-{bp}-{n}).
// A API espelha a do react-bootstrap: <Col sm={12} md={9} .../>.

type Breakpoint = number | boolean;

interface RowProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Row({ children, className, style }: RowProps) {
  return (
    <div className={`row ci-row${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

interface ColProps {
  children?: ReactNode;
  xs?: Breakpoint;
  sm?: Breakpoint;
  md?: Breakpoint;
  lg?: Breakpoint;
  xl?: Breakpoint;
  className?: string;
  style?: CSSProperties;
}

function classeCol(prefixo: string, valor?: Breakpoint): string | null {
  if (valor == null || valor === false) return null;
  if (valor === true) return prefixo; // col / col-sm (largura automática)
  return `${prefixo}-${valor}`;
}

export function Col({ children, xs, sm, md, lg, xl, className, style }: ColProps) {
  const classes = [
    classeCol("col", xs),
    classeCol("col-sm", sm),
    classeCol("col-md", md),
    classeCol("col-lg", lg),
    classeCol("col-xl", xl),
  ].filter(Boolean);

  // Sem nenhum breakpoint informado → coluna fluida.
  if (classes.length === 0) classes.push("col");
  if (className) classes.push(className);

  return (
    <div className={classes.join(" ")} style={style}>
      {children}
    </div>
  );
}
