export type TipoFormaPagamento = "DINHEIRO" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "TRANSFERENCIA" | "OUTRO";

export const TIPOS_FORMA_PAGAMENTO: { value: TipoFormaPagamento; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de débito" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "OUTRO", label: "Outro" },
];

export const EH_CARTAO = (tipo: string): boolean =>
  tipo === "CARTAO_CREDITO" || tipo === "CARTAO_DEBITO";

export const EH_CREDITO = (tipo: string): boolean => tipo === "CARTAO_CREDITO";

// Bandeiras de cartão — enum fixo, alinhado ao BandeiraCartao do backend.
// value é o NOME (o que trafega na API); label é o texto exibido.
export const BANDEIRAS_CARTAO: { value: string; label: string }[] = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "ELO", label: "Elo" },
  { value: "AMEX", label: "American Express" },
  { value: "HIPERCARD", label: "Hipercard" },
  { value: "DINERS", label: "Diners Club" },
  { value: "DISCOVER", label: "Discover" },
  { value: "JCB", label: "JCB" },
  { value: "AURA", label: "Aura" },
  { value: "CABAL", label: "Cabal" },
  { value: "OUTRA", label: "Outra" },
];

export interface FormaPagamento {
  id: string;
  nome: string;
  tipo: TipoFormaPagamento;
  bandeira: string | null;
  banco: string | null;
  ultimosDigitos: string | null;
  /** 1..31, só para crédito — dia em que a fatura fecha */
  diaFechamento: number | null;
  /** 1..31, só para crédito — dia em que a fatura vence */
  diaVencimento: number | null;
  cor: string | null;
  permiteParcelamento: boolean;
  ativo: boolean;
}

/**
 * Linha sintética da listagem: a fatura de um cartão de crédito, posicionada
 * na data de vencimento e somando as compras de um fechamento ao outro.
 * Não existe no banco — é montada pelo backend.
 */
export interface LinhaFatura {
  tipoLinha: "FATURA";
  id: string;
  dataLancamento: string;
  valor: number | string;
  tipo: "SAIDA";
  formaPagamento: { id: string; nome: string; tipo: TipoFormaPagamento; cor: string | null };
  competencia: string;
  periodoInicio: string;
  periodoFim: string;
  quantidade: number;
}

/** Extrato completo de uma fatura, vindo de GET /faturas */
export interface FaturaDetalhe {
  formaPagamento: FormaPagamento & { diaFechamento: number; diaVencimento: number };
  competencia: string;
  periodoInicio: string;
  periodoFim: string;
  vencimento: string;
  /** true quando é a fatura em que uma compra feita hoje entraria */
  aberta: boolean;
  total: number;
  quantidade: number;
  items: Lancamento[];
}


export interface Origem {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
}

export interface Pessoa {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
}

export type TipoLancamento = "ENTRADA" | "SAIDA";

// ─── Dívidas com pessoas (ledger separado) ───────────────────────────────────
type PessoaResumida = { id: string; nome: string; cor: string | null };

/** Um movimento de dívida: ENTRADA = a receber, SAÍDA = a pagar. */
export interface DividaItem {
  id: string;
  titulo: string;
  tipo: TipoLancamento;
  valor: string;
  descricao: string | null;
  data: string;
  pessoa?: PessoaResumida;
}

/** Saldo por pessoa, pro carrossel. saldo > 0 = a receber; < 0 = a pagar. */
export interface DividaResumoPessoa {
  pessoa: PessoaResumida;
  saldo: number;
  quantidade: number;
}

/** Extrato de uma pessoa: os movimentos e o saldo com ela. */
export interface DividaExtrato {
  pessoa: PessoaResumida;
  saldo: number;
  quantidade: number;
  items: DividaItem[];
}

export interface Lancamento {
  id: string;
  valor: string;
  tipo: TipoLancamento;
  descricao: string | null;
  dataLancamento: string;
  formaPagamento: { id: string; nome: string; tipo: TipoFormaPagamento; cor: string | null };
  /** Exatamente um entre origem e pessoa vem preenchido */
  origem: { id: string; nome: string; cor: string | null } | null;
  pessoa: { id: string; nome: string; cor: string | null } | null;
  /** Fatura destino ("2026-08"); só cartão de crédito */
  competenciaFatura: string | null;
  tipoLinha?: "LANCAMENTO";
}

/** O que a listagem devolve: lançamentos individuais e faturas fechadas. */
export type LinhaListagem = Lancamento | LinhaFatura;

export const ehFatura = (linha: LinhaListagem): linha is LinhaFatura =>
  (linha as LinhaFatura).tipoLinha === "FATURA";

export interface Resumo {
  totalEntradas: string | number;
  totalSaidas: string | number;
  saldo: string | number;
}

export interface ResumoPorOrigem {
  id: string;
  nome: string;
  cor: string | null;
  total: number;
}

export interface ResumoPorFormaPagamento {
  formaPagamentoId: string;
  total: number;
}

export interface ResumoEvolucaoLinha {
  mes: string;
  tipo: TipoLancamento;
  total: number;
}

export interface PerfilUsuario {
  id: string;
  login: string;
  nome: string | null;
}
