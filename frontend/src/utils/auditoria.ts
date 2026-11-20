// Filtro da tela de auditoria e conversão para os parâmetros da API.

export interface FiltroAuditoria {
  dataInicio: string;
  dataFim: string;
  acao: string;
  situacao: string;
  usuario: string;
  rota: string;
}

export const FILTRO_AUDITORIA_VAZIO: FiltroAuditoria = {
  dataInicio: '',
  dataFim: '',
  acao: '',
  situacao: '',
  usuario: '',
  rota: '',
};

/** Converte o filtro da tela nos parâmetros da API (datas no início/fim do dia local). */
export function paramsDoFiltro(f: FiltroAuditoria): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.dataInicio) params.dataInicio = new Date(`${f.dataInicio}T00:00:00`).toISOString();
  if (f.dataFim) params.dataFim = new Date(`${f.dataFim}T23:59:59.999`).toISOString();
  if (f.acao) params.acao = f.acao;
  if (f.situacao) params.situacao = f.situacao;
  if (f.usuario.trim()) params.usuario = f.usuario.trim();
  if (f.rota.trim()) params.rota = f.rota.trim();
  return params;
}
