import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { X, PlusCircle, Trash2, Pencil } from "lucide-react";

interface Coluna {
  titulo: string;
  width?: string;
  className?: string;
}

interface FormDetailsHandle {
  novo: () => Promise<void>;
  cancelar: () => Promise<void>;
  salvar: () => Promise<void>;
  selecionarParaAlteracao: (index: number) => Promise<void>;
  isInserindo: () => boolean;
  isAlterando: () => boolean;
  indiceEmEdicao: () => number | null;
}

interface FormDetailsProps {
  titulo?: string;
  itens?: unknown[];
  colunas?: () => Coluna[];
  linha: (item: unknown, index: number) => ReactNode[];
  formulario?: (params: { aoCancelar: () => void; aoSelecionar: (item: unknown) => void }) => ReactNode;
  formularioPadrao?: (params: { aoCancelar: () => void; aoSelecionar: (item: unknown) => void }) => ReactNode;
  novo?: () => Promise<void>;
  inserir?: () => Promise<void>;
  alterar?: (index: number) => Promise<void>;
  excluir?: (index: number) => void;
  cancelar?: () => void;
  selecionarParaAlteracao?: (index: number) => Promise<void>;
  aoSelecionar?: (item: unknown) => Promise<void>;
  aposSalvar?: (state: object, inserindo: boolean, alterando: boolean) => void;
  podeInserir?: boolean;
  podeExcluir?: (index: number) => boolean;
  acoes?: (item: object, index: number) => ReactNode;
  acoesRapidas?: () => ReactNode;
  modal?: boolean;
  fullScreen?: boolean;
  gradeSempreVisivel?: boolean;
  exibirTitulos?: boolean;
  exibirRodape?: boolean;
  textoParaVazio?: string;
  tituloDoBotaoCancelar?: string;
  tituloDasAcoes?: () => string;
  autoFoco?: React.RefObject<HTMLElement>;
  setConcluido?: (v: boolean) => void;
  tableStyle?: React.CSSProperties;
  formStyle?: React.CSSProperties;
  select?: boolean;
  rodape?: () => ReactNode;
  /** Quando informado, o "+" abre um painel inline para marcar vários itens de
   *  uma vez (em vez do formulário). Os marcados voltam por aoConfirmarSelecao. */
  selecionaveis?: { itens: unknown[]; rotulo: (item: unknown) => ReactNode };
  aoConfirmarSelecao?: (itens: unknown[]) => void;
  rotuloConfirmarSelecao?: string;
}

const FormDetails = forwardRef<FormDetailsHandle, FormDetailsProps>(function FormDetails(props, ref) {
  const [state, setState] = useState({
    inserindo: false,
    alterando: false,
    indiceEmEdicao: null as number | null,
    exibirTitulos: props.exibirTitulos !== false,
    exibirRodape: props.exibirRodape === true,
  });

  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const disponiveis = props.selecionaveis?.itens ?? [];

  const alternarSelecionado = (index: number) =>
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(index)) proximo.delete(index);
      else proximo.add(index);
      return proximo;
    });

  const alternarTodosSelecionados = () =>
    setSelecionados((atual) => (atual.size === disponiveis.length ? new Set() : new Set(disponiveis.map((_, i) => i))));

  const cancelarSelecao = () => {
    setSelecionando(false);
    setSelecionados(new Set());
  };

  const confirmarSelecao = () => {
    const escolhidos = Array.from(selecionados).map((i) => disponiveis[i]);
    props.aoConfirmarSelecao?.(escolhidos);
    cancelarSelecao();
  };

  useEffect(() => {
    if (props.autoFoco?.current && (state.inserindo || state.alterando)) {
      setTimeout(() => props.autoFoco!.current!.focus(), 100);
    }
    props.setConcluido?.(!state.inserindo && !state.alterando);
  }, [state.inserindo, state.alterando]);

  const novo = async () => {
    if (props.novo) await props.novo();
    setState((p) => ({ ...p, inserindo: true, alterando: false, indiceEmEdicao: null }));
  };

  const abrir = () => {
    if (props.selecionaveis) setSelecionando(true);
    else novo();
  };

  const cancelar = async () => {
    if (props.cancelar) props.cancelar();
    setState((p) => ({ ...p, inserindo: false, alterando: false, indiceEmEdicao: null }));
  };

  const selecionarParaAlteracao = async (index: number) => {
    if (props.selecionarParaAlteracao) await props.selecionarParaAlteracao(index);
    setState((p) => ({ ...p, alterando: true, inserindo: false, indiceEmEdicao: index }));
  };

  const salvar = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const onOk = () => {
        setState((p) => ({ ...p, inserindo: false, alterando: false }));
        resolve();
      };
      if (state.inserindo) {
        props.inserir?.().then(() => { onOk(); props.aposSalvar?.({}, true, false); }).catch(reject);
      } else {
        props.alterar?.(state.indiceEmEdicao!).then(() => { onOk(); props.aposSalvar?.({}, false, true); }).catch(reject);
      }
    });

  const aoCancelar = () => setState((p) => ({ ...p, inserindo: false }));

  const aoSelecionar = (item: unknown) => {
    if (props.aoSelecionar) {
      props.aoSelecionar(item as never).then(() => {
        setState((p) => ({ ...p, inserindo: false, alterando: false }));
        props.aposSalvar?.({}, true, false);
      });
    }
  };

  useImperativeHandle(ref, () => ({
    novo,
    cancelar,
    salvar,
    selecionarParaAlteracao,
    isInserindo: () => state.inserindo,
    isAlterando: () => state.alterando,
    indiceEmEdicao: () => state.indiceEmEdicao,
  }));

  const colunas = props.colunas?.() ?? [];
  const semEdicao = !state.inserindo && !state.alterando && !selecionando;
  const mostraGrade = semEdicao || props.modal || props.gradeSempreVisivel || props.formularioPadrao;

  return (
    <div className="sub-cadastro">
      <div className="sub-cadastro__header">
        <span className="sub-cadastro__titulo">{props.titulo}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {props.acoesRapidas?.()}
          {semEdicao && props.podeInserir !== false && (props.novo || props.formularioPadrao || props.inserir || props.selecionaveis) && (
            <button className="sub-cadastro__novo" onClick={abrir} title="Novo">
              <PlusCircle size={22} />
            </button>
          )}
        </div>
      </div>

      {selecionando && props.selecionaveis && (
        <div className="sub-cadastro__form" style={props.formStyle}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={disponiveis.length > 0 && selecionados.size === disponiveis.length}
              onChange={alternarTodosSelecionados}
            />
            Selecionar todos
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
            {disponiveis.length === 0 ? (
              <div style={{ color: "var(--cor-texto-suave)", padding: 8 }}>Nada disponível</div>
            ) : (
              disponiveis.map((item, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selecionados.has(i)} onChange={() => alternarSelecionado(i)} />
                  <span>{props.selecionaveis!.rotulo(item)}</span>
                </label>
              ))
            )}
          </div>
          <div className="sub-cadastro__form-acoes">
            <button className="btn btn--secundario btn--sm" onClick={cancelarSelecao}>
              {props.tituloDoBotaoCancelar ?? "Cancelar"}
            </button>
            <button className="btn btn--primario btn--sm" onClick={confirmarSelecao} disabled={selecionados.size === 0}>
              {props.rotuloConfirmarSelecao ?? `Adicionar (${selecionados.size})`}
            </button>
          </div>
        </div>
      )}

      {(state.inserindo || state.alterando) && props.formulario && !props.formularioPadrao && !props.modal && !props.fullScreen && (
        <div className="sub-cadastro__form" style={props.formStyle}>
          {props.formulario({ aoCancelar, aoSelecionar })}
          <div className="sub-cadastro__form-acoes">
            <button className="btn btn--secundario btn--sm" onClick={cancelar}>
              {props.tituloDoBotaoCancelar ?? "Cancelar"}
            </button>
            <button className="btn btn--primario btn--sm" onClick={salvar}>
              {state.alterando ? "OK" : "Inserir"}
            </button>
          </div>
        </div>
      )}

      {(state.inserindo || state.alterando) && props.formulario && props.modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div className="card" style={{ width: "min(600px, 95vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="secao-header" style={{ marginBottom: 12 }}>
              <span className="secao-header__titulo">{props.titulo}</span>
              <button className="overlay__fechar" onClick={cancelar}><X size={16} /></button>
            </div>
            {props.formulario({ aoCancelar, aoSelecionar })}
            <div className="sub-cadastro__form-acoes" style={{ marginTop: 16 }}>
              <button className="btn btn--secundario btn--sm" onClick={cancelar}>
                {props.tituloDoBotaoCancelar ?? "Cancelar"}
              </button>
              <button className="btn btn--primario btn--sm" onClick={salvar}>
                {state.alterando ? "OK" : "Inserir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(state.inserindo || state.alterando) && props.formulario && props.fullScreen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--cor-fundo)", padding: 16, overflowY: "auto" }}>
          <div className="secao-header" style={{ marginBottom: 16 }}>
            <span className="secao-header__titulo">{props.titulo}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--secundario btn--sm" onClick={cancelar}>
                {props.tituloDoBotaoCancelar ?? "Cancelar"}
              </button>
              <button className="btn btn--primario btn--sm" onClick={salvar}>OK</button>
            </div>
          </div>
          {props.formulario({ aoCancelar, aoSelecionar })}
        </div>
      )}

      {mostraGrade && (
        <div className="tabela-wrapper">
          <table className="tabela" style={semEdicao ? props.tableStyle : undefined}>
            {state.exibirTitulos && colunas.length > 0 && props.itens && props.itens.length > 0 && (
              <thead>
                <tr>
                  {colunas.map((col, i) => (
                    <th key={i} className={col.className} style={{ width: col.width }}>
                      {col.titulo}
                    </th>
                  ))}
                  {(props.alterar || props.excluir || props.acoes) && (
                    <th className="acoes">{props.tituloDasAcoes?.() ?? "Ações"}</th>
                  )}
                </tr>
              </thead>
            )}
            <tbody>
              {!props.itens || props.itens.length === 0 ? (
                <tr className="tabela__vazio">
                  <td colSpan={colunas.length + 1}>{props.textoParaVazio ?? "<vazio>"}</td>
                </tr>
              ) : (
                props.itens.map((item, rowIndex) =>
                  !item ? null : (
                    <tr
                      key={rowIndex}
                      className={props.select ? "clicavel" : undefined}
                    >
                      {props.linha(item, rowIndex).map((dado, i) => (
                        <td key={i} className={colunas[i]?.className} style={{ width: colunas[i]?.width }}>
                          {dado}
                        </td>
                      ))}
                      {(props.alterar || props.excluir || props.acoes) && (
                        <td className="acoes">
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            {props.alterar && (!props.gradeSempreVisivel || semEdicao) && (
                              <button className="btn btn--ghost btn--sm" style={{ padding: "4px 6px" }} title="Editar" onClick={() => selecionarParaAlteracao(rowIndex)}>
                                <Pencil size={16} />
                              </button>
                            )}
                            {props.excluir && (!props.podeExcluir || props.podeExcluir(rowIndex)) && (
                              <button
                                className="btn btn--ghost btn--sm"
                                style={{ color: "var(--cor-erro)", padding: "4px 6px" }}
                                title="Excluir"
                                onClick={() => props.excluir!(rowIndex)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            {props.acoes?.({}, rowIndex)}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )
              )}
              {state.exibirRodape && !state.inserindo && !state.alterando && props.itens && props.itens.length > 0 && props.rodape?.()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default FormDetails;
