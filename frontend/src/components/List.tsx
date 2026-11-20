import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildQueryString } from "../utils/helpers";
import { ArrowDown, ChevronsDown } from "lucide-react";

interface Coluna {
  titulo: string;
  width?: string;
  className?: string;
  orderby?: string;
}

interface ListState {
  itens: unknown[] | null;
  quantidadeDeDados: number | null;
  quantidadeTotalDeDados: number | null;
  podeAvancar: boolean;
  podeCarregarTodos: boolean;
  vazio: boolean;
  carregando: boolean;
  ordenacao: string | undefined;
  tamanhoDaPagina: number;
}

export interface ListHandle {
  filtrar: () => Promise<void>;
  cancelarClick: () => Promise<void>;
}

interface Props {
  url: string;
  api: { getAll: (url: string) => Promise<{ items: unknown[]; count: number; pageSize: number }> };
  titulo?: string;
  ordenacaoPadrao?: string;
  getTitulosDaTabela: () => Coluna[];
  getDadosDaTabela: (item: unknown) => ReactNode[];
  getFiltro?: () => Promise<Record<string, unknown>>;
  renderizarFiltros?: () => ReactNode;
  getCustomStyle?: (item: unknown, colIndex: number) => React.CSSProperties | undefined;
  aoSelecionar?: (item: unknown) => void;
  aoInserir?: () => void;
  aoCancelar?: () => void;
  aoFechar?: () => void;
  select?: { aoSelecionar?: (item: unknown) => void; aoCancelar?: () => void };
  form?: { aoSelecionar?: (item: unknown) => void };
  onRowClick?: (item: unknown, index: number) => void;
  onRowDoubleClick?: (item: unknown, index: number) => void;
  highlightIndex?: number;
  esconderTitulo?: boolean;
  esconderAcoes?: boolean;
  esconderCabecalhos?: boolean;
  esconderNavegacao?: boolean;
  esconderBotaoFechar?: boolean;
  iniciarVazio?: boolean;
  estruturaPadrao?: boolean;
  useHorizontalScroll?: boolean;
  inline?: boolean;
  emtpyText?: string;
  setFormState?: (patch: Partial<ListState>) => void;
  getFormState?: () => ListState;
}

const List = forwardRef<ListHandle, Props>(function List(props, ref) {
  const [state, setState] = useState<ListState>({
    itens: null,
    quantidadeDeDados: null,
    quantidadeTotalDeDados: null,
    podeAvancar: false,
    podeCarregarTodos: false,
    vazio: true,
    carregando: false,
    ordenacao: props.ordenacaoPadrao,
    tamanhoDaPagina: 30,
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const getFiltro = props.getFiltro ?? (() => Promise.resolve({} as Record<string, unknown>));

  const filtrar = useCallback(async () => {
    setState((p) => ({ ...p, itens: [], carregando: true, vazio: true }));
    try {
      const filtro = await getFiltro();
      let query = "";
      if (filtro) {
        if (props.estruturaPadrao) {
          if (filtro.id) query = `?id=${filtro.id}`;
          else query = buildQueryString(stateRef.current.tamanhoDaPagina, null, stateRef.current.ordenacao, filtro);
        } else {
          const params = Object.entries(filtro)
            .filter(([, v]) => v != null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&");
          if (params) query = `?${params}`;
        }
      }
      const data = await props.api.getAll(props.url + query);
      const itens = props.estruturaPadrao ? data.items : (data as unknown as unknown[]);
      const count = props.estruturaPadrao ? data.count : itens.length;
      const pageSize = props.estruturaPadrao ? data.pageSize : itens.length;
      setState((p) => ({
        ...p,
        itens,
        quantidadeDeDados: pageSize,
        quantidadeTotalDeDados: count,
        podeAvancar: count > itens.length && itens.length >= p.tamanhoDaPagina,
        podeCarregarTodos: count > itens.length,
        vazio: itens.length === 0,
        carregando: false,
      }));
    } catch {
      setState((p) => ({ ...p, carregando: false }));
    }
  }, [props.url, props.estruturaPadrao, props.api, getFiltro]);

  const navegar = useCallback(
    async (opcao: 1 | 2) => {
      const current = stateRef.current;
      const filtro = await getFiltro();
      let query = "";
      if ((filtro as Record<string, unknown>).id) {
        query = `?id=${(filtro as Record<string, unknown>).id}`;
      } else if (opcao === 1) {
        query = buildQueryString(current.tamanhoDaPagina, String(current.itens?.length ?? 0), current.ordenacao, filtro);
      } else {
        query = buildQueryString(null, null, current.ordenacao, filtro);
      }
      setState((p) => ({ ...p, carregando: true }));
      const data = await props.api.getAll(props.url + query);
      const novosItens = [...(opcao === 1 ? current.itens ?? [] : []), ...data.items];
      setState((p) => ({
        ...p,
        itens: novosItens,
        quantidadeDeDados: novosItens.length,
        quantidadeTotalDeDados: data.count,
        podeAvancar: data.count > novosItens.length,
        podeCarregarTodos: data.count > novosItens.length,
        vazio: novosItens.length === 0,
        carregando: false,
      }));
    },
    [props.url, props.api, getFiltro]
  );

  const cancelarClick = useCallback(async () => {
    props.select?.aoCancelar?.();
    props.aoCancelar?.();
    props.aoFechar?.();
  }, [props]);

  const handleClick = useCallback(
    (item: unknown, index: number) => {
      props.aoSelecionar?.(item);
      props.onRowClick?.(item, index);
      props.select?.aoSelecionar?.(item);
      props.form?.aoSelecionar?.(item);
    },
    [props]
  );

  const handleDoubleClick = useCallback(
    (item: unknown, index: number) => props.onRowDoubleClick?.(item, index),
    [props]
  );

  useEffect(() => {
    if (!props.iniciarVazio) filtrar();
  }, [state.ordenacao]);

  useImperativeHandle(ref, () => ({ filtrar, cancelarClick }));

  const colunas = props.getTitulosDaTabela();
  const clicavel = !!(props.aoSelecionar || props.select?.aoSelecionar || props.form?.aoSelecionar || props.onRowClick);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", flexGrow: 1, backgroundColor: "var(--cor-fundo)" }}>
      <div className="secao-header">
        <span className="secao-header__titulo" style={{ cursor: "pointer" }} onClick={filtrar}>
          {props.titulo}
        </span>
        <div className="secao-header__acoes">
          {props.renderizarFiltros?.()}
          {props.aoInserir && (
            <button className="btn btn--primario btn--sm" onClick={props.aoInserir}>+ Novo</button>
          )}
        </div>
      </div>

      {!props.esconderAcoes && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", borderBottom: "1px solid var(--cor-borda)" }}>
          <button className="btn btn--primario btn--sm" onClick={filtrar}>Pesquisar</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "hidden", overflowX: props.useHorizontalScroll ? "auto" : "hidden", display: "flex", flexDirection: "column" }}>
        {!props.esconderCabecalhos && !isMobile && (
          <div style={{ flexShrink: 0 }}>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    {colunas.map((col, i) => (
                      <th
                        key={i}
                        className={col.className}
                        style={{ width: col.width, cursor: col.orderby && props.estruturaPadrao ? "pointer" : "default" }}
                        onClick={() => {
                          if (col.orderby && props.estruturaPadrao) {
                            let ord = col.orderby;
                            if (ord === state.ordenacao) ord += " desc";
                            setState((p) => ({ ...p, ordenacao: ord }));
                          }
                        }}
                      >
                        {col.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {isMobile ? (
            !state.itens || state.vazio ? (
              <p style={{ textAlign: "center", color: "var(--cor-texto-suave)", padding: 24 }}>
                {state.carregando ? "Carregando..." : (props.emtpyText ?? "<vazio>")}
              </p>
            ) : (
              state.itens.map((item, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`lista-card${clicavel ? " clicavel" : ""}`}
                  onClick={() => handleClick(item, rowIndex)}
                >
                  {props.getDadosDaTabela(item).map((dado, i) => {
                    const customStyle = props.getCustomStyle?.(item, i);
                    return (
                      <div key={i} className="lista-card__campo">
                        <span className="lista-card__label">{colunas[i]?.titulo}:&nbsp;</span>
                        <span style={customStyle}>{dado}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <tbody>
                  {!state.itens || state.vazio ? (
                    <tr className="tabela__vazio">
                      <td colSpan={colunas.length}>
                        {state.carregando ? "Carregando..." : (props.emtpyText ?? "<vazio>")}
                      </td>
                    </tr>
                  ) : (
                    state.itens.map((item, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={clicavel ? "clicavel" : undefined}
                        style={{ backgroundColor: props.highlightIndex === rowIndex ? "var(--cor-primaria-hover)" : undefined }}
                        onClick={() => handleClick(item, rowIndex)}
                        onDoubleClick={() => handleDoubleClick(item, rowIndex)}
                      >
                        {props.getDadosDaTabela(item).map((dado, i) => {
                          const customStyle = props.getCustomStyle?.(item, i);
                          return (
                            <td key={i} className={colunas[i]?.className} style={{ width: colunas[i]?.width, ...customStyle }}>
                              {dado}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="navegador">
        {!props.esconderBotaoFechar && (
          <button className="btn btn--secundario btn--sm" onClick={cancelarClick}>Fechar</button>
        )}
        {state.quantidadeTotalDeDados != null && (
          <span>
            Mostrando {state.quantidadeDeDados} de {state.quantidadeTotalDeDados}
          </span>
        )}
        <button
          className="btn btn--secundario btn--sm"
          disabled={!state.podeAvancar}
          onClick={() => navegar(1)}
          title="Carregar mais"
        >
          <ArrowDown size={16} />
        </button>
        <button
          className="btn btn--secundario btn--sm"
          disabled={!state.podeCarregarTodos}
          onClick={() => navegar(2)}
          title="Carregar todos"
        >
          <ChevronsDown size={16} />
        </button>
      </div>
    </div>
  );
});

export default List;
