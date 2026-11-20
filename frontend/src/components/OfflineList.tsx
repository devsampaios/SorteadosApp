import { useCallback, useEffect, useState } from "react";
import { isAsyncFunction } from "../utils/helpers";

interface Coluna {
  titulo: string;
  width?: string;
  className?: string;
}

interface Props {
  titulo?: string;
  getItens: () => unknown[] | Promise<unknown[]>;
  getTitulosDaTabela: () => Coluna[];
  getDadosDaTabela: (item: unknown, index: number) => React.ReactNode[];
  renderizarFiltros?: (params: { filtrar: () => void }) => React.ReactNode;
  aoSelecionar?: (item: unknown) => void;
  select?: { aoSelecionar?: (item: unknown) => void; aoCancelar?: () => void };
  form?: { aoSelecionar?: (item: unknown) => void };
  aoFechar?: () => void;
  aoCancelar?: () => void;
  esconderTitulo?: boolean;
  esconderFiltros?: boolean;
  esconderAcoes?: boolean;
  esconderCabecalhos?: boolean;
  esconderNavegacao?: boolean;
  esconderBotaoFechar?: boolean;
  iniciarVazio?: boolean;
  highlightIndex?: number;
  version?: unknown;
  mostrarRodape?: boolean;
  rodape?: () => React.ReactNode;
}

export default function OfflineList({
  titulo,
  getItens,
  getTitulosDaTabela,
  getDadosDaTabela,
  renderizarFiltros,
  aoSelecionar,
  select,
  form,
  aoFechar,
  aoCancelar,
  esconderTitulo,
  esconderFiltros,
  esconderAcoes,
  esconderCabecalhos,
  esconderNavegacao,
  esconderBotaoFechar,
  iniciarVazio,
  highlightIndex,
  version,
  mostrarRodape,
  rodape,
}: Props) {
  const [itens, setItens] = useState<unknown[] | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const filtrar = useCallback(async () => {
    const resultado = isAsyncFunction(getItens)
      ? await (getItens as () => Promise<unknown[]>)()
      : (getItens as () => unknown[])();
    setItens(resultado);
  }, [getItens]);

  useEffect(() => {
    if (!iniciarVazio) filtrar();
  }, []);

  useEffect(() => {
    if (version !== undefined) filtrar();
  }, [version]);

  const handleClick = useCallback(
    (item: unknown) => {
      aoSelecionar?.(item);
      select?.aoSelecionar?.(item);
      form?.aoSelecionar?.(item);
    },
    [aoSelecionar, select, form]
  );

  const cancelarClick = () => {
    select?.aoCancelar?.();
    aoCancelar?.();
    aoFechar?.();
  };

  const colunas = getTitulosDaTabela();
  const titulos = colunas.map((c) => c.titulo);
  const clicavel = !!(aoSelecionar || select?.aoSelecionar || form?.aoSelecionar);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", flexGrow: 1, backgroundColor: "var(--cor-fundo)" }}>
      {!esconderTitulo && titulo && (
        <div className="secao-header">
          <span className="secao-header__titulo">{titulo}</span>
        </div>
      )}

      {!esconderFiltros && renderizarFiltros && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--cor-borda)" }}>
          {renderizarFiltros({ filtrar })}
        </div>
      )}

      {!esconderAcoes && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--cor-borda)" }}>
          <button className="btn btn--secundario btn--sm" onClick={filtrar}>
            Pesquisar
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {!esconderCabecalhos && !isMobile && (
          <div style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--cor-fundo)" }}>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    {colunas.map((col, i) => (
                      <th key={i} className={col.className} style={{ width: col.width }}>
                        {col.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        )}

        {isMobile ? (
          !itens || itens.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--cor-texto-suave)", padding: 24 }}>
              {itens === null ? "Carregando..." : "<vazio>"}
            </p>
          ) : (
            <>
              {itens.map((item, rowIndex) =>
                !item ? null : (
                  <div
                    key={rowIndex}
                    className={`lista-card${clicavel ? " clicavel" : ""}`}
                    onClick={() => handleClick(item)}
                  >
                    {getDadosDaTabela(item, rowIndex).map((dado, i) => (
                      <div key={i} className="lista-card__campo">
                        <span className="lista-card__label">{titulos[i]}:&nbsp;</span>
                        <span>{dado}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
              {mostrarRodape && rodape?.()}
            </>
          )
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <tbody>
                {!itens || itens.length === 0 ? (
                  <tr className="tabela__vazio">
                    <td colSpan={colunas.length}>
                      {itens === null ? "Carregando..." : "<vazio>"}
                    </td>
                  </tr>
                ) : (
                  itens.map((item, rowIndex) =>
                    !item ? null : (
                      <tr
                        key={rowIndex}
                        className={clicavel ? "clicavel" : undefined}
                        style={{ backgroundColor: highlightIndex === rowIndex ? "var(--cor-primaria-hover)" : undefined }}
                        onClick={() => handleClick(item)}
                      >
                        {getDadosDaTabela(item, rowIndex).map((dado, i) => (
                          <td key={i} className={colunas[i]?.className} style={{ width: colunas[i]?.width }}>
                            {dado}
                          </td>
                        ))}
                      </tr>
                    )
                  )
                )}
              </tbody>
              {mostrarRodape && <tfoot>{rodape?.()}</tfoot>}
            </table>
          </div>
        )}
      </div>

      {!esconderNavegacao && (
        <div className="navegador">
          {!esconderBotaoFechar && (
            <button className="btn btn--secundario btn--sm" onClick={cancelarClick}>
              Fechar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
