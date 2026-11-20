import {
  forwardRef,
  Fragment,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ChevronsDown, Eye, MoreVertical, Pencil, PlusCircle, Search, Trash2, X } from "lucide-react";
import { isNumeric } from "../utils/helpers";
import { useToast } from "../toast/ToastContext";
import { Button, Card, corDot, Filler } from "./utils";
import api from "../service/Api";


/**
 * Helpers para o corpo do formulário atualizarem o formState sem repetir o
 * padrão de spread. Usado nas views novas:
 *
 *   const { setItemSelecionado } = makeFormHelpers(setFormState);
 *   setItemSelecionado({ nome: value });
 */
// eslint-disable-next-line react-refresh/only-export-components
export function makeFormHelpers(setFormState: React.Dispatch<React.SetStateAction<FormState>>) {
  return {
    /** Faz merge de campos no item selecionado (registro em edição). */
    setItemSelecionado: (patch: Record<string, unknown>) =>
      setFormState((s) => ({ ...s, itemSelecionado: { ...(s.itemSelecionado ?? {}), ...patch } })),
    /** Define um único campo do item selecionado. */
    setCampo: (campo: string, valor: unknown) =>
      setFormState((s) => ({ ...s, itemSelecionado: { ...(s.itemSelecionado ?? {}), [campo]: valor } })),
    /** Faz merge no formState (raiz). */
    setMany: (patch: Partial<FormState>) => setFormState((s) => ({ ...s, ...patch })),
  };
}

interface Coluna {
  titulo: string;
  width?: string;
  className?: string;
  orderby?: string;
}

export interface FormState {
  itemSelecionado: Record<string, unknown> | null;
  itens: unknown[];
  vazio: boolean;
  consultou: boolean;
  navegando: boolean;
  incluindo: boolean;
  alterando: boolean;
  visualizando?: boolean;
  filtro: { texto?: string | null; id?: string };
  botaoSalvarHabilitado: boolean;
  quantidadeDeDados: number | null;
  quantidadeTotalDeDados: number | null;
  podeAvancar: boolean;
  podeCarregarTodos: boolean;
  mostrarFormulario: boolean;
  ordenacao: string;
  tamanhoDaPagina: number;
  carregando: boolean;
  versaoAnterior: Record<string, unknown> | null;
}

export interface FormHandle {
  filtrar: (ordenacao?: string) => Promise<void>;
  navegar: (opcao: 1 | 2) => Promise<void>;
  inserirClick: () => Promise<void>;
  editarClick: (item: Record<string, unknown>) => Promise<void>;
  cancelarClick: () => Promise<void>;
  salvar: () => Promise<void>;
  getFormState: () => FormState;
  setFormState: (patch: Partial<FormState>) => void;
}

interface Pagina {
  items: unknown[];
  count: number;
  pageSize: number;
}

interface SessionManager {
  isMaster: boolean;
}

interface FormProps {
  url: string;
  fastUrl?: string;
  titulo?: string;
  ordenacaoPadrao?: string;
  protegido?: boolean;
  sessionManager?: SessionManager;
  getTitulosDaTabela?: () => Coluna[];
  getDadosDaTabela?: (item: unknown) => ReactNode[];
  renderizarFormulario?: (params: {
    formState: FormState;
    setFormState: React.Dispatch<React.SetStateAction<FormState>>;
    salvar: () => Promise<void>;
    cancelar: () => Promise<void>;
    editar: (item: Record<string, unknown>) => Promise<void>;
    setMany: (patch: Partial<FormState>) => void;
  }) => ReactNode;
  getFiltro?: (filtroBase: Record<string, unknown>) => Record<string, unknown>;
  filtroExtra?: () => Record<string, unknown>;
  getPayload: (formState: FormState, setFormState: React.Dispatch<React.SetStateAction<FormState>>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  getItemVazio?: () => Record<string, unknown>;
  itemVazio?: Record<string, unknown>;
  antesDeInserir?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  aposInserir?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  antesDeEditar?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  aposEditar?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  antesDeSalvar?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  antesDeExcluir?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>) => Promise<void> | void;
  aposSalvar?: (state: FormState, set: React.Dispatch<React.SetStateAction<FormState>>, idGerado?: unknown) => Promise<void> | void;
  aoSalvar?: () => void;
  select?: { aoSelecionar?: (item: unknown, flag?: boolean) => void; aoCancelar?: () => void; getSearchText?: () => string };
  form?: { aoSelecionar?: (item: unknown, flag?: boolean) => void; aoCancelar?: () => void };
  modal?: boolean;
  aoCancelar?: () => void;
  apenasInserir?: boolean;
  apenasAlterar?: boolean;
  id?: string | number;
  autoFoco?: React.RefObject<HTMLElement | null>;
  esconderFiltro?: boolean;
  esconderTitulo?: boolean;
  esconderNavegacao?: boolean;
  esconderCancelar?: boolean;
  esconderAcoes?: boolean;
  /** Esconde o botão de inserir novo item no cabeçalho (ex: quando a criação é feita por outro fluxo) */
  esconderNovo?: boolean;
  /** Esconde editar/excluir em linhas que não são registros reais (ex: uma fatura agrupada) */
  permitirAcoes?: (item: unknown) => boolean;
  inline?: boolean;
  maxWidth?: number;
  minHeight?: number;
  overflowY?: string;
  overflowX?: string;
  formularioClassName?: string;
  getAcoesDaTabela?: (item: unknown) => ReactNode;
  renderizarFiltros?: () => ReactNode;
  /** Agrupa a listagem por uma chave (ex.: o dia). Renderiza um cabeçalho por
   *  grupo — com o subtotal, se a view quiser — tanto na tabela (desktop) quanto
   *  nos cards (mobile). Os itens já devem vir ordenados/contíguos por chave. */
  agrupamento?: {
    chave: (item: unknown) => string;
    renderCabecalho: (chave: string, itens: unknown[]) => ReactNode;
  };
  /** Abre a edição com um clique na linha (além do lápis), como nos extratos de
   *  fatura/dívida. Respeita permitirAcoes. Não vale em modo select/form. */
  editarNoClique?: boolean;
  /** Quando informado, o duplo clique na linha chama este callback em vez de
   *  abrir a edição (ex.: telas somente-leitura que abrem um modal de detalhes). */
  aoAbrirLinha?: (item: unknown) => void;
  /** Quando informado, a listagem vira um grid de cards em vez de tabela/lista — a view controla o markup do card por completo. */
  renderizarCard?: (item: unknown, acoes: CardAcoes) => ReactNode;
  /** Config declarativa para listagem em card — alternativa a renderizarCard para views de cadastro simples: a view só passa os campos, sem escrever um componente de card. Ignorado se renderizarCard também for informado. */
  card?: CardConfig;
  /** grid-template-columns do grid de cards (default: repeat(auto-fill, minmax(240px, 1fr))) */
  cardColunas?: string;
  /** Rótulo do botão de inserir (default: "+ Novo") */
  rotuloNovo?: string;
  /** Mensagem exibida quando a listagem está vazia (default: "<vazio>") */
  mensagemVazio?: string;
}

export interface CardAcoes {
  editar: () => void;
  excluir: () => void;
  recarregar: () => void;
  podeAlterar: boolean;
  podeExcluir: boolean;
}

export interface CardConfig {
  /** Campo (ou função) usado como título do card */
  titulo: string | ((item: Record<string, unknown>) => ReactNode);
  /** Campo (ou função) usado como subtítulo, exibido abaixo do título */
  subtitulo?: string | ((item: Record<string, unknown>) => ReactNode);
  /** Linha extra opcional, exibida abaixo do subtítulo (ex: detalhe condicional) */
  linhaExtra?: (item: Record<string, unknown>) => ReactNode;
  /** Campo (ou função) que retorna a cor de destaque (dot + borda esquerda) */
  cor?: string | ((item: Record<string, unknown>) => string | null | undefined);
  /** Campo booleano que indica se o item está ativo (controla opacidade e o botão ativar/desativar) */
  campoAtivo?: string;
  /** Esconde o botão de ativar/desativar mesmo quando campoAtivo é informado */
  esconderToggleAtivo?: boolean;
  /** Esconde o botão de excluir */
  esconderExcluir?: boolean;
}

const resolverCampo = (
  item: Record<string, unknown>,
  campo: string | ((item: Record<string, unknown>) => ReactNode) | undefined
): ReactNode => (typeof campo === "function" ? campo(item) : campo ? (item[campo] as ReactNode) : undefined);

// Agrupa itens consecutivos que compartilham a mesma chave, preservando a ordem.
function agruparConsecutivo(itens: unknown[], chave: (item: unknown) => string): { chave: string; itens: unknown[] }[] {
  const grupos: { chave: string; itens: unknown[] }[] = [];
  for (const item of itens) {
    const k = chave(item);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === k) ultimo.itens.push(item);
    else grupos.push({ chave: k, itens: [item] });
  }
  return grupos;
}

// Chave estável de item pra key do React (id quando existe).
const chaveItem = (item: unknown, fallback: number): string | number =>
  (item as { id?: string | number }).id ?? fallback;

// Menu de ações (três pontos verticais). O popup é posicionado com position:fixed
// a partir do gatilho pra não ser cortado pelo scroll da tabela/lista. Fecha ao
// clicar fora, ao rolar/redimensionar e ao escolher qualquer item (onClickCapture).
function AcoesMenu({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const abrir = () => {
    const r = gatilhoRef.current?.getBoundingClientRect();
    if (r) {
      const larguraPopup = 220;
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      let left = r.right - larguraPopup;
      if (vw > 0) left = Math.min(left, vw - larguraPopup - 8);
      left = Math.max(8, left);
      setCoords({ top: r.bottom + 4, left });
    }
    setAberto(true);
  };

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!popupRef.current?.contains(alvo) && !gatilhoRef.current?.contains(alvo)) setAberto(false);
    };
    const fechar = () => setAberto(false);
    document.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={gatilhoRef}
        className="btn btn--ghost btn--sm"
        title="Ações"
        aria-label="Ações"
        onClick={(e) => {
          e.stopPropagation();
          if (aberto) setAberto(false);
          else abrir();
        }}
      >
        <MoreVertical size={16} />
      </button>
      {aberto &&
        createPortal(
          <div
            ref={popupRef}
            className="user-menu__popup"
            style={{ position: "fixed", top: coords.top, left: coords.left, right: "auto", zIndex: 3000 }}
            // Fecha DEPOIS do clique processar. Fechar na captura desmontava o
            // popup antes do onClick do item disparar (React 19), então a ação
            // nunca rodava. O defer deixa o onClick do item rodar primeiro.
            onClickCapture={() => setTimeout(() => setAberto(false), 0)}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

const Form = forwardRef<FormHandle, FormProps>(function Form(props, ref) {
  const { showSuccess, showError, showConfirm } = useToast();

  const podeEditar = useMemo(
    () => (props.protegido ? (props.sessionManager?.isMaster ?? false) : true),
    [props.protegido, props.sessionManager],
  );
  const podeIncluir = podeEditar;
  const podeAlterar = podeEditar;
  const podeExcluir = podeEditar;

  const [formState, setFormState] = useState<FormState>({
    itemSelecionado: null,
    itens: [],
    vazio: false,
    consultou: false,
    navegando: true,
    incluindo: false,
    alterando: false,
    filtro: {},
    botaoSalvarHabilitado: true,
    quantidadeDeDados: null,
    quantidadeTotalDeDados: null,
    podeAvancar: false,
    podeCarregarTodos: false,
    mostrarFormulario: true,
    ordenacao: props.ordenacaoPadrao ?? "Id",
    tamanhoDaPagina: 30,
    carregando: false,
    versaoAnterior: null,
  });

  const stateRef = useRef(formState);
  stateRef.current = formState;
  const filtroRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const setMany = (patch: Partial<FormState>) => setFormState((p) => ({ ...p, ...patch }));

  const getItemVazio = (): Record<string, unknown> => {
    if (props.getItemVazio) return props.getItemVazio() ?? {};
    return props.itemVazio ? { ...props.itemVazio } : {};
  };

  const buildFiltro = (f: { texto?: string | null; id?: string }): Record<string, unknown> => {
    const result: Record<string, unknown> = props.filtroExtra ? { ...props.filtroExtra() } : {};
    if (f?.texto) {
      const texto = String(f.texto);
      if (texto[0] === "#") {
        if (!isNumeric(texto.substring(1))) {
          showError(`Código inválido: "${texto.substring(1)}"`);
          return result;
        }
        result.id = texto.substring(1);
      } else {
        result.searchable = texto;
      }
    }
    return props.getFiltro ? props.getFiltro(result) : result;
  };

  // Lista paginada no REST do backend (traduz skip → page). O backend responde
  // no contrato { items, count, pageSize } consumido pela UI.
  const listar = (baseUrl: string, skip: number | null, ord: string, filtro: Record<string, unknown>): Promise<Pagina> => {
    const pageSize = stateRef.current.tamanhoDaPagina;
    const page = Math.floor((skip ?? 0) / pageSize) + 1;
    return api.query<Pagina>(baseUrl, { page, pageSize, orderBy: ord, ...filtro });
  };

  // GET de 1 registro por id (path REST), devolvido no formato de página da UI.
  const buscarPorId = async (baseUrl: string, id: unknown): Promise<Pagina> => {
    const obj = await api.get<Record<string, unknown> | null>(`${baseUrl}/${String(id)}`);
    return { items: obj ? [obj] : [], count: obj ? 1 : 0, pageSize: 1 };
  };

  const filtrar = async (ordenacao?: string) => {
    const ord = ordenacao ?? stateRef.current.ordenacao;
    setMany({ itens: [], quantidadeDeDados: null, quantidadeTotalDeDados: null, vazio: true, carregando: true });
    const filtro = stateRef.current.filtro;
    const baseUrl = props.fastUrl ?? props.url;
    try {
      const data = filtro.id
        ? await buscarPorId(baseUrl, filtro.id)
        : await listar(baseUrl, null, ord, buildFiltro(filtro));
      setMany({
        itens: data.items ?? [],
        quantidadeDeDados: data.items?.length ?? 0,
        quantidadeTotalDeDados: data.count ?? 0,
        podeAvancar: (data.count ?? 0) > (data.items?.length ?? 0) && (data.items?.length ?? 0) >= stateRef.current.tamanhoDaPagina,
        podeCarregarTodos: (data.count ?? 0) > (data.items?.length ?? 0),
        vazio: !data || data.count === 0,
        carregando: false,
        consultou: true,
      });
    } catch {
      setMany({ carregando: false });
    }
  };

  const navegar = async (opcao: 1 | 2) => {
    const current = stateRef.current;
    const ord = current.ordenacao;
    const baseUrl = props.fastUrl ?? props.url;
    try {
      const data = current.filtro.id
        ? await buscarPorId(baseUrl, current.filtro.id)
        : await listar(baseUrl, opcao === 1 ? current.itens.length : null, ord, buildFiltro(current.filtro));
      const lista = opcao === 1 ? [...current.itens, ...data.items] : [...data.items];
      setMany({
        itens: lista,
        quantidadeDeDados: lista.length,
        quantidadeTotalDeDados: data.count ?? 0,
        podeAvancar: (data.count ?? 0) > lista.length,
        podeCarregarTodos: (data.count ?? 0) > lista.length,
        vazio: lista.length === 0,
      });
    } catch {
      // erro já reportado ao usuário via showError nos callers
    }
  };

  const getItem = async (id: unknown): Promise<Record<string, unknown> | null> => {
    return await api.get<Record<string, unknown> | null>(`${props.url}/${String(id)}`);
  };

  const inserirClick = async () => {
    const run = async () => {
      const item = getItemVazio();
      const patch = { itemSelecionado: item, navegando: false, alterando: false, incluindo: true };
      setMany(patch);
      // aposInserir recebe o estado JÁ com o item — setMany é assíncrono, então
      // stateRef.current ainda não reflete o item aqui.
      if (props.aposInserir) await props.aposInserir({ ...stateRef.current, ...patch }, setFormState);
    };
    if (props.antesDeInserir) await Promise.resolve(props.antesDeInserir(stateRef.current, setFormState)).then(run);
    else await run();
  };

  const editarClick = async (clickedItem: Record<string, unknown>) => {
    const result = await getItem(clickedItem.id);
    if (!result) { showError("Registro não localizado para alteração"); return; }
    const item = JSON.parse(JSON.stringify(result));
    const run = async () => {
      const patch = { itemSelecionado: item, versaoAnterior: item, navegando: false, alterando: true, incluindo: false };
      setMany(patch);
      // aposEditar precisa do item recém-carregado, não do stateRef desatualizado
      // (setMany só reflete no próximo render). Sem isso, o mapeamento aborta e o
      // form mostra a linha crua (origem/data ficam em branco).
      if (props.aposEditar) await props.aposEditar({ ...stateRef.current, ...patch }, setFormState);
    };
    if (props.antesDeEditar) await Promise.resolve(props.antesDeEditar(stateRef.current, setFormState)).then(run);
    else await run();
  };

  const cancelarClick = async () => {
    if (props.apenasAlterar) {
      setMany({ itemSelecionado: { ...stateRef.current.versaoAnterior! } });
    } else {
      setMany({
        navegando: props.select || props.form ? false : true,
        alterando: false,
        incluindo: false,
        itemSelecionado: getItemVazio(),
        visualizando: false,
      });
    }
    props.select?.aoCancelar?.();
    props.aoCancelar?.();
    props.form?.aoCancelar?.();
  };

  const excluir = async (item: Record<string, unknown>) => {
    await api.delete<void>(`${props.url}/${String(item.id)}`);
    showSuccess("Excluído com sucesso!");
    setMany({ navegando: true, alterando: false, incluindo: false, itens: [], itemSelecionado: getItemVazio() });
    filtrar(stateRef.current.ordenacao);
  };

  const excluirClick = async (item: Record<string, unknown>) => {
    const run = () => showConfirm("Deseja realmente excluir este registro?", () => excluir(item));
    if (props.antesDeExcluir) await Promise.resolve(props.antesDeExcluir(stateRef.current, setFormState)).then(run);
    else run();
  };

  const salvar = async () => {
    if (props.antesDeSalvar) await Promise.resolve(props.antesDeSalvar(stateRef.current, setFormState));
    setMany({ botaoSalvarHabilitado: false });
    try {
      const input = await Promise.resolve(props.getPayload(stateRef.current, setFormState));
      setMany({ botaoSalvarHabilitado: true });
      const current = stateRef.current;

      if (current.incluindo) {
        const criado = await api.post<{ id: string | number }>(props.url, input);
        const idGerado = criado.id;
        if (props.aposSalvar) await Promise.resolve(props.aposSalvar(stateRef.current, setFormState, idGerado));
        if (props.select?.aoSelecionar || props.form?.aoSelecionar || (props.modal && (props as { aoSelecionar?: (i: unknown, f?: boolean) => void }).aoSelecionar)) {
          const result = await buscarPorId(props.url, idGerado);
          const item = result.items[0];
          props.select?.aoSelecionar?.(item, true);
          props.form?.aoSelecionar?.(item, true);
        } else if (!props.id) {
          setMany({ navegando: true, alterando: false, incluindo: false, itens: [], itemSelecionado: getItemVazio() });
          showSuccess("Salvo com sucesso!");
          filtrar(current.ordenacao);
        }
      } else if (current.alterando) {
        await api.put<void>(`${props.url}/${String((input as { id: unknown }).id)}`, input);
        if (props.aposSalvar) await Promise.resolve(props.aposSalvar(stateRef.current, setFormState));
        if (props.select?.aoSelecionar || props.form?.aoSelecionar) {
          const result = await buscarPorId(props.url, (input as { id: unknown }).id);
          const item = result.items[0];
          props.select?.aoSelecionar?.(item, true);
          props.form?.aoSelecionar?.(item, true);
        } else if (!props.id) {
          setMany({ navegando: true, alterando: false, incluindo: false, itens: [], itemSelecionado: getItemVazio() });
          showSuccess("Salvo com sucesso!");
          filtrar(current.ordenacao);
        }
      }
      props.aoSalvar?.();
    } catch {
      setMany({ botaoSalvarHabilitado: true });
    }
  };

  useEffect(() => {
    (async () => {
      if (props.apenasInserir) { inserirClick(); return; }
      if (props.apenasAlterar && props.id != null) {
        try {
          const data = await buscarPorId(props.url, props.id);
          const item = data.items[0] as Record<string, unknown>;
          if (item) editarClick(item);
          else showError("Registro não localizado para alteração");
        } catch {
      // erro já reportado ao usuário via showError nos callers
    }
        return;
      }
      filtrar();
    })();
  }, []);

  useEffect(() => {
    if (!formState.filtro?.texto) filtrar(formState.ordenacao);
  }, [formState.filtro?.texto]);

  useEffect(() => {
    if (formState.incluindo || formState.alterando) {
      setTimeout(() => props.autoFoco?.current?.focus(), 100);
    }
  }, [formState.incluindo, formState.alterando]);

  useImperativeHandle(ref, () => ({
    filtrar,
    navegar,
    inserirClick,
    editarClick,
    cancelarClick,
    salvar,
    getFormState: () => stateRef.current,
    setFormState: (patch) => setMany(patch),
  }));

  const colunas = props.getTitulosDaTabela?.() ?? [];

  const renderCardPadrao = (item: Record<string, unknown>, acoes: CardAcoes) => {
    const config = props.card!;
    const cor = typeof config.cor === "function" ? config.cor(item) : config.cor ? (item[config.cor] as string) : undefined;
    const ativo = config.campoAtivo ? Boolean(item[config.campoAtivo]) : true;

    const alternarAtivo = async () => {
      if (!config.campoAtivo) return;
      try {
        await api.put<void>(`${props.url}/${String(item.id)}`, { id: item.id, [config.campoAtivo]: !ativo });
        acoes.recarregar();
      } catch {
        showError("Não foi possível atualizar");
      }
    };

    return (
      <Card style={{ display: "flex", flexDirection: "column", height: "100%", opacity: ativo ? 1 : 0.55, borderLeft: `3px solid ${cor || "var(--cor-borda)"}` }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {cor && <span style={corDot(cor, 10)} />}
          {resolverCampo(item, config.titulo)}
        </div>
        {config.subtitulo && (
          <div style={{ fontSize: 12, color: "var(--cor-texto-suave)" }}>{resolverCampo(item, config.subtitulo)}</div>
        )}
        {config.linhaExtra && (
          <div style={{ fontSize: 12, color: "var(--cor-texto-suave)", marginTop: 4 }}>{config.linhaExtra(item)}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 16, flexWrap: "wrap" }}>
          {acoes.podeAlterar && <Button label="Editar" variant="secondary" size="sm" onClick={acoes.editar} />}
          {config.campoAtivo && !config.esconderToggleAtivo && acoes.podeAlterar && (
            <Button label={ativo ? "Desativar" : "Ativar"} variant="ghost" size="sm" onClick={alternarAtivo} />
          )}
          {!config.esconderExcluir && acoes.podeExcluir && (
            <Button label="Excluir" variant="danger" size="sm" onClick={acoes.excluir} />
          )}
        </div>
      </Card>
    );
  };

  const renderLista = () => {
    const clicavel = !!(props.select || props.form);
    if (formState.vazio) {
      return (
        <p style={{ textAlign: "center", color: "var(--cor-texto-suave)", padding: 24 }}>
          {formState.carregando ? "Carregando..." : (props.mensagemVazio ?? "<vazio>")}
        </p>
      );
    }
    if (props.renderizarCard || props.card) {
      const renderizarItem = props.renderizarCard ?? ((item: unknown, acoes: CardAcoes) => renderCardPadrao(item as Record<string, unknown>, acoes));
      return (
        <div style={{ display: "grid", gridTemplateColumns: props.cardColunas ?? "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {formState.itens.map((item, i) => (
            <div key={i}>
              {renderizarItem(item, {
                editar: () => editarClick(item as Record<string, unknown>),
                excluir: () => excluirClick(item as Record<string, unknown>),
                recarregar: () => filtrar(stateRef.current.ordenacao),
                podeAlterar,
                podeExcluir,
              })}
            </div>
          ))}
        </div>
      );
    }
    // Card de um item (mobile).
    const renderCard = (item: unknown, i: number) => {
      const dados = props.getDadosDaTabela?.(item) ?? [];
      return (
        <div
          key={chaveItem(item, i)}
          className={`lista-card${clicavel || props.editarNoClique ? " clicavel" : ""}`}
          onClick={() => {
            if (props.select?.aoSelecionar || props.form?.aoSelecionar) { doRowClick(item as Record<string, unknown>); return; }
            if (props.editarNoClique && !(props.permitirAcoes && !props.permitirAcoes(item))) editarClick(item as Record<string, unknown>);
          }}
          onDoubleClick={() => {
            if (props.select || props.form || props.editarNoClique) return;
            if (props.permitirAcoes && !props.permitirAcoes(item)) return;
            if (props.aoAbrirLinha) { props.aoAbrirLinha(item); return; }
            editarClick(item as Record<string, unknown>);
          }}
        >
          {dados.map((dado, j) => (
            <div key={j} className="lista-card__campo">
              <span className="lista-card__label">{colunas[j]?.titulo}:&nbsp;</span>
              <span>{dado}</span>
            </div>
          ))}
          {renderAcoesInline(item as Record<string, unknown>)}
        </div>
      );
    };

    if (isMobile) {
      const ag = props.agrupamento;
      if (!ag) return formState.itens.map((item, i) => renderCard(item, i));
      return agruparConsecutivo(formState.itens, ag.chave).map((grupo, gi) => (
        <div key={`g${gi}`}>
          <div className="lista-grupo">{ag.renderCabecalho(grupo.chave, grupo.itens)}</div>
          {grupo.itens.map((item, i) => renderCard(item, gi * 1000 + i))}
        </div>
      ));
    }

    // Linha de um item (desktop, tabela).
    const renderLinha = (item: unknown, i: number) => {
      const dados = props.getDadosDaTabela?.(item) ?? [];
      return (
        <tr
          key={chaveItem(item, i)}
          className={clicavel || props.editarNoClique ? "clicavel" : undefined}
          onClick={() => {
            if (clicavel) { doRowClick(item as Record<string, unknown>); return; }
            if (props.editarNoClique && !(props.permitirAcoes && !props.permitirAcoes(item))) editarClick(item as Record<string, unknown>);
          }}
          onDoubleClick={() => {
            if (clicavel || props.editarNoClique) return;
            if (props.permitirAcoes && !props.permitirAcoes(item)) return;
            if (props.aoAbrirLinha) { props.aoAbrirLinha(item); return; }
            editarClick(item as Record<string, unknown>);
          }}
        >
          {dados.map((dado, j) => (
            <td key={j} className={colunas[j]?.className} style={{ width: colunas[j]?.width }}>
              {dado}
            </td>
          ))}
          {renderAcoesCelula(item as Record<string, unknown>)}
        </tr>
      );
    };

    const colSpan = colunas.length + (props.select || props.form ? 0 : 1);
    return (
      <div className="tabela-wrapper">
        <table className="tabela">
          <thead>
            <tr>
              {colunas.map((col, i) => (
                <th
                  key={i}
                  className={col.className}
                  style={{ width: col.width, cursor: col.orderby ? "pointer" : "default" }}
                  onClick={() => {
                    if (col.orderby) {
                      let ord = col.orderby;
                      if (ord === formState.ordenacao) ord += " desc";
                      setMany({ ordenacao: ord });
                      filtrar(ord);
                    }
                  }}
                >
                  {col.titulo}
                </th>
              ))}
              {!props.select && !props.form && <th className="acoes">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {props.agrupamento
              ? agruparConsecutivo(formState.itens, props.agrupamento.chave).map((grupo, gi) => (
                  <Fragment key={`g${gi}`}>
                    <tr className="lista-grupo">
                      <td colSpan={colSpan}>{props.agrupamento!.renderCabecalho(grupo.chave, grupo.itens)}</td>
                    </tr>
                    {grupo.itens.map((item, i) => renderLinha(item, gi * 1000 + i))}
                  </Fragment>
                ))
              : formState.itens.map((item, i) => renderLinha(item, i))}
          </tbody>
        </table>
      </div>
    );
  };

  const doRowClick = async (item: Record<string, unknown>) => {
    if (props.select?.aoSelecionar || props.form?.aoSelecionar) {
      const result = await buscarPorId(props.url, item.id);
      const selecionado = result.items[0];
      props.select?.aoSelecionar?.(selecionado);
      props.form?.aoSelecionar?.(selecionado);
    }
  };

  // Itens do menu de ações (três pontos). Editar/Ver, ações extras da view e Excluir.
  const itensDeAcao = (item: Record<string, unknown>) => (
    <>
      {!props.esconderAcoes && (
        <button
          className="user-menu__item"
          onClick={(e) => { e.stopPropagation(); editarClick(item); }}
        >
          {podeAlterar ? <Pencil size={16} /> : <Eye size={16} />} {podeAlterar ? "Editar" : "Ver"}
        </button>
      )}
      {props.getAcoesDaTabela?.(item)}
      {!props.esconderAcoes && podeExcluir && (
        <button
          className="user-menu__item user-menu__item--perigo"
          onClick={(e) => { e.stopPropagation(); excluirClick(item); }}
        >
          <Trash2 size={16} /> Excluir
        </button>
      )}
    </>
  );

  const renderAcoesCelula = (item: Record<string, unknown>) => {
    if (props.select || props.form) return null;
    if (props.permitirAcoes && !props.permitirAcoes(item)) return <td className="acoes" />;
    return (
      <td className="acoes">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AcoesMenu>{itensDeAcao(item)}</AcoesMenu>
        </div>
      </td>
    );
  };

  const renderAcoesInline = (item: Record<string, unknown>) => {
    if (props.select || props.form) return null;
    if (props.permitirAcoes && !props.permitirAcoes(item)) return null;
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <AcoesMenu>{itensDeAcao(item)}</AcoesMenu>
      </div>
    );
  };

  const content = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", position: "relative", backgroundColor: "var(--cor-fundo)" }}>
      {!props.id && (
        <>
          <div className="secao-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!props.esconderTitulo && (
                <span className="secao-header__titulo" style={{ cursor: "pointer" }} onClick={() => filtrar(formState.ordenacao)}>
                  {props.titulo}
                </span>
              )}
              {formState.navegando && podeIncluir && !props.esconderNovo && (
                <button className="secao-header__novo" onClick={inserirClick} title="Novo">
                  <PlusCircle size={22} />
                </button>
              )}
            </div>
            <div className="secao-header__acoes">
              {formState.navegando &&
                (props.renderizarFiltros
                  ? props.renderizarFiltros()
                  : !props.esconderFiltro && (
                      <div style={{ display: "flex", gap: 6 }}>
                        {formState.filtro?.texto && (
                          <button className="btn btn--ghost btn--sm" title="Limpar filtro" onClick={() => setMany({ filtro: { texto: "" } })}><X size={16} /></button>
                        )}
                        <input
                          ref={filtroRef}
                          className="input"
                          type="text"
                          placeholder="filtrar..."
                          autoComplete="off"
                          style={{ width: 200, height: 32, padding: "4px 10px" }}
                          value={formState.filtro?.texto ?? ""}
                          onChange={(e) => setMany({ filtro: { ...formState.filtro, texto: e.target.value } })}
                          onKeyDown={(e) => e.key === "Enter" && filtrar(formState.ordenacao)}
                        />
                        <button className="btn btn--primario btn--sm" title="Pesquisar" onClick={() => filtrar(formState.ordenacao)}><Search size={16} /></button>
                      </div>
                    ))}
              {(formState.incluindo || formState.alterando) && (
                <div style={{ display: "flex", gap: 8 }}>
                  {!props.esconderCancelar && (
                    <button className="btn btn--secundario btn--sm" onClick={cancelarClick}>
                      {formState.visualizando ? "Fechar" : podeAlterar ? "Cancelar" : "Fechar"}
                    </button>
                  )}
                  {((formState.incluindo && podeIncluir) || (formState.alterando && podeAlterar)) && !formState.visualizando && (
                    <button className="btn btn--primario btn--sm" disabled={!formState.botaoSalvarHabilitado} onClick={salvar}>
                      {formState.botaoSalvarHabilitado ? "Salvar" : "Salvando..."}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {formState.navegando && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(props.card || props.renderizarCard) && <Filler height={16} />}
              {renderLista()}
            </div>
          )}

          {(formState.incluindo || formState.alterando) && formState.mostrarFormulario && props.renderizarFormulario && (
            <div
              className={props.formularioClassName ?? ""}
              style={{ overflowY: (props.overflowY as "auto") ?? "auto", overflowX: (props.overflowX as "hidden") ?? "hidden", padding: "8px 0", flex: 1 }}
            >
              <div style={{ maxWidth: props.maxWidth ?? 800, minHeight: props.minHeight ?? 400, margin: "0 auto", padding: !props.select && !props.form && !props.modal ? 10 : undefined }}>
                {/* key por registro: remonta os campos ao trocar de item, para
                    que inputs não-controlados (defaultValue) reflitam o novo valor. */}
                <fieldset key={formState.incluindo ? "novo" : String(formState.itemSelecionado?.id ?? "x")} disabled={!(formState.incluindo && podeIncluir) && !(formState.alterando && podeAlterar)}>
                  {props.renderizarFormulario({ formState, setFormState, salvar, cancelar: cancelarClick, editar: editarClick, setMany })}
                </fieldset>
              </div>
            </div>
          )}

          {formState.navegando && !props.esconderNavegacao && (
            <div className="navegador">
              {(props.select || props.form || props.modal) && !formState.incluindo && (
                <button className="btn btn--secundario btn--sm" onClick={cancelarClick}>Fechar</button>
              )}
              {formState.quantidadeTotalDeDados != null && (
                <span>Mostrando {formState.quantidadeDeDados} de {formState.quantidadeTotalDeDados}</span>
              )}
              <button className="btn btn--secundario btn--sm" disabled={!formState.podeAvancar} onClick={() => navegar(1)} title="Carregar mais"><ArrowDown size={16} /></button>
              <button className="btn btn--secundario btn--sm" disabled={!formState.podeCarregarTodos} onClick={() => navegar(2)} title="Carregar todos"><ChevronsDown size={16} /></button>
            </div>
          )}
        </>
      )}

      {props.id && formState.alterando && (
        <>
          <div className="secao-header">
            {!props.esconderTitulo && (
              <span className="secao-header__titulo">{props.titulo}</span>
            )}
            <div className="secao-header__acoes">
              {!props.esconderCancelar && (
                <button className="btn btn--secundario btn--sm" onClick={cancelarClick}>
                  {formState.visualizando ? "Fechar" : podeAlterar ? "Cancelar" : "Fechar"}
                </button>
              )}
              {(formState.alterando && podeAlterar) && !formState.visualizando && (
                <button className="btn btn--primario btn--sm" disabled={!formState.botaoSalvarHabilitado} onClick={salvar}>
                  {formState.botaoSalvarHabilitado ? "Salvar" : "Salvando..."}
                </button>
              )}
            </div>
          </div>
          {formState.mostrarFormulario && props.renderizarFormulario && (
            <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
              <fieldset key={String(formState.itemSelecionado?.id ?? "x")} disabled={!(formState.alterando && podeAlterar)}>
                {props.renderizarFormulario({ formState, setFormState, salvar, cancelar: cancelarClick, editar: editarClick, setMany })}
              </fieldset>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (props.modal) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
        <div style={{ width: "min(900px, 96vw)", height: "min(700px, 94vh)", display: "flex", flexDirection: "column", background: "var(--cor-fundo)", borderRadius: "var(--raio)", overflow: "hidden" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
});

export default Form;
