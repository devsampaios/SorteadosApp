import type { ReactNode } from "react";
import "./assets/BoldLabel.css";

interface BoldLabelProps {
  children?: ReactNode;
  htmlFor?: string;
  obrigatorio?: boolean;
}

// Rótulo em negrito dos campos. `obrigatorio` adiciona o asterisco vermelho.
export default function BoldLabel({ children, htmlFor, obrigatorio }: BoldLabelProps) {
  return (
    <label htmlFor={htmlFor} className={`ci-bold-label${obrigatorio ? " ci-bold-label--obrigatorio" : ""}`}>
      {children}
    </label>
  );
}
