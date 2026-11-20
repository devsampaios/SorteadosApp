const FORMATADOR_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: string | number): string {
  return FORMATADOR_BRL.format(Number(valor));
}

export function parseValorBR(raw: string): number {
  const limpo = raw.trim();
  if (!limpo) return NaN;
  return limpo.includes(",")
    ? parseFloat(limpo.replace(/\./g, "").replace(",", "."))
    : parseFloat(limpo);
}

/**
 * Máscara de centavos: recebe o texto digitado, considera só os dígitos e
 * formata como moeda (1234 → "12,34", 5 → "0,05"). Vazio → "". É assim que o
 * usuário digita só números e o valor já vem no padrão ,00 — sem digitar a
 * vírgula. Limita a 13 dígitos pra não estourar a precisão de número.
 */
export function formatarCentavos(bruto: string): string {
  const digitos = bruto.replace(/\D/g, "").slice(0, 13);
  if (!digitos) return "";
  return (parseInt(digitos, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Número (reais) → texto do CurrencyInput ("1.234,56"), pra pré-preencher edição. */
export function paraInputMoeda(valor: number | string): string {
  const n = Number(valor);
  if (!isFinite(n) || n === 0) return "";
  return formatarCentavos(String(Math.round(n * 100)));
}

/**
 * Normaliza qualquer valor pro texto exibido no CurrencyInput, seja ele já
 * formatado ("20,00", "1.234,56") ou um número cru vindo da API ("20", "20.5").
 * Assim o campo mostra sempre no padrão ,00 sem depender de quem o preenche.
 *
 * Regra: com vírgula = já é o formato do input (só reaplica a máscara); sem
 * vírgula = número de reais a formatar.
 */
export function exibicaoMoeda(valor: string): string {
  if (!valor) return "";
  return valor.includes(",") ? formatarCentavos(valor) : paraInputMoeda(valor);
}
