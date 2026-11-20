import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ConteudoSobrepostoItem {
  key: string;
  titulo?: string | null;
  view: ReactNode;
  aoFechar?: () => Promise<boolean | undefined | void> | void;
}

interface Props {
  conteudosSobrepostos?: ConteudoSobrepostoItem[];
  removerConteudoSobreposto: (key: string) => void;
}

export default function ConteudoSobreposto({
  conteudosSobrepostos = [],
  removerConteudoSobreposto,
}: Props) {
  const fechar = async (item: ConteudoSobrepostoItem) => {
    if (item.aoFechar) {
      const podeFechar = await item.aoFechar();
      if (podeFechar === false) return;
    }
    removerConteudoSobreposto(item.key);
  };

  return (
    <>
      {conteudosSobrepostos.map((item, index) => (
        <div
          key={item.key}
          className="overlay"
          style={{ zIndex: 2000 + index }}
        >
          {item.titulo != null && (
            <div className="overlay__header">
              <span className="overlay__titulo">{item.titulo}</span>
              <button
                className="overlay__fechar"
                onClick={() => fechar(item)}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="overlay__conteudo">{item.view}</div>
        </div>
      ))}
    </>
  );
}
