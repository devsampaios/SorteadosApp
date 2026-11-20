import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../service/Api';
import { aulasDaCarga } from '../utils/enum';
import { feriado } from '../utils/feriados';

interface DisciplinaLite {
  id: string;
  nome: string;
  cargaHoraria: number | null;
  dataInicio: string | null;
  horarios: { diaSemana: { id: number } | null }[];
}

interface Props {
  disciplinaId: string;
  disciplina: DisciplinaLite;
  onFechar: () => void;
}

// Cor da data por dia da semana (como na referência).
const COR_DIA: Record<number, string> = {
  0: '#64748b',
  1: '#9333ea',
  2: '#dc2626',
  3: '#0d9488',
  4: '#ca8a04',
  5: '#2563eb',
  6: '#059669',
};

const pad = (n: number): string => String(n).padStart(2, '0');
const chaveData = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dataCurta = (d: Date): string => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const parseData = (s: string): Date => {
  const [ano, mes, dia] = s.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export default function AulaDetalheModal({ disciplinaId, disciplina, onFechar }: Props) {
  const [topicos, setTopicos] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [presencas, setPresencas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const diasComAula = useMemo(
    () => disciplina.horarios.map((h) => h.diaSemana?.id).filter((x): x is number => x != null),
    [disciplina],
  );

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .getAll<{ topicos: { data: string; topico: string }[]; presencas: string[] }>(
        `/disciplinas/${disciplinaId}/aulas`,
      )
      .then((r) => {
        const mapa: Record<string, string> = {};
        (r.topicos ?? []).forEach((t) => (mapa[t.data] = t.topico));
        setTopicos(mapa);
        setDraft(mapa);
        setPresencas(new Set(r.presencas ?? []));
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [disciplinaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalAulas = aulasDaCarga(disciplina.cargaHoraria);

  // Aulas a partir do início do período da disciplina: uma por dia em que a
  // disciplina tem horário, até completar o total previsto pela carga horária
  // (carga/2). Um feriado também é um dia de aula — ocupa um slot, mas vira
  // linha "FERIADO".
  const itens = useMemo(() => {
    if (!disciplina.dataInicio || totalAulas <= 0 || diasComAula.length === 0) {
      return [];
    }
    const lista: ({ tipo: 'aula'; data: Date } | { tipo: 'feriado'; data: Date; nome: string })[] = [];
    const dia = parseData(disciplina.dataInicio);
    let guarda = 0;
    while (lista.length < totalAulas && guarda < 4000) {
      guarda++;
      if (diasComAula.includes(dia.getDay())) {
        const nomeFeriado = feriado(dia);
        if (nomeFeriado) {
          lista.push({ tipo: 'feriado', data: new Date(dia), nome: nomeFeriado });
        } else {
          lista.push({ tipo: 'aula', data: new Date(dia) });
        }
      }
      dia.setDate(dia.getDate() + 1);
    }
    return lista;
  }, [disciplina.dataInicio, totalAulas, diasComAula]);

  const salvarTopico = (data: Date) => {
    const chave = chaveData(data);
    const valor = draft[chave] ?? '';
    if (valor === (topicos[chave] ?? '')) {
      return;
    }
    api
      .put(`/disciplinas/${disciplinaId}/topico`, { data: chave, topico: valor })
      .then(() =>
        setTopicos((atual) => {
          const proximo = { ...atual };
          if (valor.trim() === '') {
            delete proximo[chave];
          } else {
            proximo[chave] = valor;
          }
          return proximo;
        }),
      )
      .catch(() => {});
  };

  const alternarPresenca = (data: Date) => {
    const chave = chaveData(data);
    const presente = !presencas.has(chave);
    api
      .put(`/disciplinas/${disciplinaId}/presenca`, { data: chave, presente })
      .then(() =>
        setPresencas((atual) => {
          const proximo = new Set(atual);
          if (presente) {
            proximo.add(chave);
          } else {
            proximo.delete(chave);
          }
          return proximo;
        }),
      )
      .catch(() => {});
  };

  const semInicio = !disciplina.dataInicio;
  const semCarga = totalAulas <= 0;

  return (
    <div className="u-modal-overlay" onClick={onFechar}>
      <div className="u-modal" onClick={(e) => e.stopPropagation()}>
        <div className="u-modal__header">
          <div>
            <div className="u-modal__titulo">{disciplina.nome}</div>
            <div className="u-modal__desc">Tópicos e presença</div>
          </div>
          <button type="button" className="u-modal__fechar" onClick={onFechar}>
            <X size={16} />
          </button>
        </div>
        <div className="u-modal__body">
          {semInicio ? (
            <p style={{ color: 'var(--cor-texto-suave)', textAlign: 'center' }}>
              Defina a data de início da disciplina para listar as aulas.
            </p>
          ) : semCarga ? (
            <p style={{ color: 'var(--cor-texto-suave)', textAlign: 'center' }}>
              Defina a carga horária da disciplina para listar as aulas.
            </p>
          ) : carregando ? (
            <p style={{ color: 'var(--cor-texto-suave)', textAlign: 'center' }}>Carregando…</p>
          ) : itens.length === 0 ? (
            <p style={{ color: 'var(--cor-texto-suave)', textAlign: 'center' }}>Nenhuma aula para esta disciplina.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itens.map((item, i) => {
                if (item.tipo === 'feriado') {
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 'var(--raio)',
                        background: 'color-mix(in srgb, var(--cor-erro) 12%, transparent)',
                        color: 'var(--cor-erro)',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      FERIADO — {item.nome} ({dataCurta(item.data)})
                    </div>
                  );
                }
                const chave = chaveData(item.data);
                const cor = COR_DIA[item.data.getDay()];
                const presente = presencas.has(chave);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background: `color-mix(in srgb, ${cor} 16%, transparent)`,
                        color: cor,
                      }}
                    >
                      {dataCurta(item.data)}
                    </span>
                    <input
                      className="input"
                      style={{ flex: 1, height: 36, minWidth: 0 }}
                      placeholder="Tópico da aula"
                      value={draft[chave] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [chave]: e.target.value }))}
                      onBlur={() => salvarTopico(item.data)}
                    />
                    <button
                      type="button"
                      title={presente ? 'Presente (clique para desmarcar)' : 'Marcar presença'}
                      onClick={() => alternarPresenca(item.data)}
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: presente ? 'none' : '1.5px solid var(--cor-borda)',
                        background: presente ? 'var(--cor-primaria)' : 'transparent',
                        color: presente ? 'var(--cor-sobre-primaria)' : 'transparent',
                      }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
