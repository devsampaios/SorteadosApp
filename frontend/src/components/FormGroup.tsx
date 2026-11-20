import type { CSSProperties, ReactNode } from "react";
import "./assets/FormGroup.css";

interface FormGroupProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Bloco de um campo: rótulo + input empilhados, com espaçamento padrão.
export default function FormGroup({ children, className, style }: FormGroupProps) {
  return (
    <div className={`ci-form-group${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
