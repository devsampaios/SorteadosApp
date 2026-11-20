import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../service/Api';
import SelectInput from '../components/SelectInput';
import AulaDetalheModal from '../components/AulaDetalheModal';
import { type ItemEnum, aulasDaCarga } from '../utils/enum';
import { feriado } from '../utils/feriados';

interface HorarioResp {
  id: string;
  diaSemana: ItemEnum | null;
  horaInicio: string;
  horaFim: string;
}
interface DisciplinaResp {
  id: string;
  nome: string;
  professor: string | null;
  sala: string | null;
  cargaHoraria: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  horarios: HorarioResp[];
}

interface Aula {
  disciplina: DisciplinaResp;
  horario: HorarioResp;
  cor: string;
}

const STORAGE_DISCIPLINA = 'app:disciplinaSelecionada';
const CORES = ['#106ebe', '#0f9d70', '#c05e92', '#de7b32', '#7b5ea7', '#2f9e5c', '#c0533a'];
const DIAS_CABECALHO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
// Altura fixa de cada hora na timeline do dia. A linha do tempo passa a ter
// altura total fixa (24 * ALTURA_HORA) e rola dentro do card; cada aula tem uma
// altura mínima para o texto não quebrar.
const ALTURA_HORA = 48;
const ALTURA_MIN_BLOCO = 64;

const inicioDoDia = (data: Date): Date => {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
};

const somarDias = (data: Date, dias: number): Date => {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
};

const mesmoDia = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const capitalizar = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

const emMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const pad = (n: number): string => String(n).padStart(2, '0');

// Chave estável de uma data (yyyy-MM-dd local) para indexar as aulas por dia.
const chaveData = (data: Date): string => `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;

// Converte "yyyy-MM-dd" (data cadastrada) numa Date local, sem deslocar por fuso.
const parseData = (iso: string): Date => {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
};

export default function InicioView() {
  const hoje = useMemo(() => inicioDoDia(new Date()), []);
  const [todasDisciplinas, setTodasDisciplinas] = useState<DisciplinaResp[]>([]);
  const [disciplinaId, setDisciplinaId] = useState<string>(() => localStorage.getItem(STORAGE_DISCIPLINA) ?? '');
  const [modo, setModo] = useState<'dia' | 'mes'>('dia');
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(hoje);
  const [mesVisivel, setMesVisivel] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [aulaAberta, setAulaAberta] = useState<{ disciplina: DisciplinaResp; horario: HorarioResp; data: Date } | null>(null);
  // Tópicos cadastrados por disciplina e data (disciplinaId -> yyyy-MM-dd -> tópico).
  const [topicosPorDisciplina, setTopicosPorDisciplina] = useState<Record<string, Record<string, string>>>({});
  const [recargaTopicos, setRecargaTopicos] = useState(0);
  const [agora, setAgora] = useState(() => new Date());
  const trilhaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api
      .getAll<{ items: DisciplinaResp[] }>('/disciplinas?pageSize=100')
      .then((pagina) => setTodasDisciplinas(pagina.items ?? []))
      .catch(() => setTodasDisciplinas([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_DISCIPLINA, disciplinaId);
  }, [disciplinaId]);

  // Disciplinas exibidas na agenda: todas ou apenas a selecionada.
  const disciplinas = useMemo(
    () => (disciplinaId ? todasDisciplinas.filter((d) => d.id === disciplinaId) : todasDisciplinas),
    [todasDisciplinas, disciplinaId],
  );

  // Busca os tópicos já cadastrados de cada disciplina (um request por
  // disciplina) para exibir no card da aula. Recarrega ao fechar o modal, que é
  // onde os tópicos são editados.
  useEffect(() => {
    if (disciplinas.length === 0) {
      setTopicosPorDisciplina({});
      return;
    }
    let cancelado = false;
    Promise.all(
      disciplinas.map((disciplina) =>
        api
          .getAll<{ topicos: { data: string; topico: string }[] }>(`/disciplinas/${disciplina.id}/aulas`)
          .then((r) => ({ id: disciplina.id, topicos: r?.topicos ?? [] }))
          .catch(() => ({ id: disciplina.id, topicos: [] as { data: string; topico: string }[] })),
      ),
    ).then((resultados) => {
      if (cancelado) {
        return;
      }
      const mapa: Record<string, Record<string, string>> = {};
      for (const resultado of resultados) {
        const porData: Record<string, string> = {};
        for (const topico of resultado.topicos) {
          porData[topico.data.slice(0, 10)] = topico.topico;
        }
        mapa[resultado.id] = porData;
      }
      setTopicosPorDisciplina(mapa);
    });
    return () => {
      cancelado = true;
    };
  }, [disciplinas, recargaTopicos]);

  const corDaDisciplina = useMemo(() => {
    const mapa = new Map<string, string>();
    disciplinas.forEach((d, i) => mapa.set(d.id, CORES[i % CORES.length]));
    return mapa;
  }, [disciplinas]);

  // Aulas por dia: cada disciplina começa na data de início da turma e vai
  // enfileirando aulas nos seus horários semanais (diaSemana 1=Seg..6=Sáb, igual
  // ao getDay()), até atingir o total previsto pela carga horária. Feriado também
  // conta como dia de aula. Sem data de início, cai numa recorrência semanal
  // aberta (janela ao redor de hoje) para não deixar a agenda vazia.
  const aulasPorDia = useMemo(() => {
    const mapa = new Map<string, Aula[]>();
    const adicionar = (data: Date, aula: Aula) => {
      const chave = chaveData(data);
      const lista = mapa.get(chave);
      if (lista) {
        lista.push(aula);
      } else {
        mapa.set(chave, [aula]);
      }
    };
    for (const disciplina of disciplinas) {
      if (disciplina.horarios.length === 0) {
        continue;
      }
      const cor = corDaDisciplina.get(disciplina.id) ?? CORES[0];
      const dataInicio = disciplina.dataInicio ? inicioDoDia(parseData(disciplina.dataInicio)) : null;
      if (dataInicio) {
        // A partir do início do período: uma aula por dia com horário, até
        // completar o total previsto pela carga horária (carga/2).
        const total = aulasDaCarga(disciplina.cargaHoraria);
        if (total <= 0) {
          continue;
        }
        let colocadas = 0;
        let dia = dataInicio;
        let guarda = 0;
        while (colocadas < total && guarda < 4000) {
          guarda++;
          const doDia = disciplina.horarios
            .filter((horario) => horario.diaSemana?.id === dia.getDay())
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          if (doDia.length > 0) {
            for (const horario of doDia) {
              adicionar(dia, { disciplina, horario, cor });
            }
            colocadas++;
          }
          dia = somarDias(dia, 1);
        }
      } else {
        // Sem data de início: recorrência semanal aberta (janela ao redor de
        // hoje) para não deixar a agenda vazia.
        const inicioJanela = somarDias(hoje, -190);
        for (let i = 0; i < 730; i++) {
          const dia = somarDias(inicioJanela, i);
          for (const horario of disciplina.horarios) {
            if (horario.diaSemana?.id === dia.getDay()) {
              adicionar(dia, { disciplina, horario, cor });
            }
          }
        }
      }
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.horario.horaInicio.localeCompare(b.horario.horaInicio));
    }
    return mapa;
  }, [disciplinas, corDaDisciplina, hoje]);

  const aulasDoDia = (data: Date): Aula[] => aulasPorDia.get(chaveData(data)) ?? [];

  // Ao abrir/entrar no dia, rola a timeline: se for hoje, foca a hora atual (com
  // um respiro acima); senão, foca a primeira aula. Não depende de `agora` de
  // propósito — não deve "puxar" o scroll a cada minuto, só ao abrir/trocar o dia.
  useEffect(() => {
    if (modo !== 'dia') {
      return;
    }
    const elemento = trilhaRef.current;
    if (!elemento) {
      return;
    }
    const momento = new Date();
    if (mesmoDia(diaSelecionado, momento)) {
      const minutosAgora = momento.getHours() * 60 + momento.getMinutes();
      elemento.scrollTop = Math.max(0, (minutosAgora / 60) * ALTURA_HORA - 60);
      return;
    }
    const aulas = aulasPorDia.get(chaveData(diaSelecionado)) ?? [];
    if (aulas.length === 0) {
      elemento.scrollTop = 0;
      return;
    }
    const primeiroInicio = Math.min(...aulas.map((aula) => emMinutos(aula.horario.horaInicio)));
    elemento.scrollTop = Math.max(0, (primeiroInicio / 60) * ALTURA_HORA - 12);
  }, [modo, diaSelecionado, aulasPorDia]);

  // Disciplinas distintas com aula no dia (dedupe por id).
  const disciplinasDoDia = (data: Date): Aula[] => {
    const mapa = new Map<string, Aula>();
    for (const aula of aulasDoDia(data)) {
      if (!mapa.has(aula.disciplina.id)) {
        mapa.set(aula.disciplina.id, aula);
      }
    }
    return [...mapa.values()];
  };

  // Bolinhas com a inicial da disciplina, uma por disciplina com aula no dia.
  const iniciais = (data: Date, max: number, tamanho = 16) => {
    const lista = disciplinasDoDia(data);
    return (
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
        {lista.slice(0, max).map((aula) => (
          <span
            key={aula.disciplina.id}
            title={aula.disciplina.nome}
            style={{
              width: tamanho,
              height: tamanho,
              borderRadius: '50%',
              background: aula.cor,
              color: '#fff',
              fontSize: tamanho * 0.6,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {aula.disciplina.nome.trim().charAt(0).toUpperCase()}
          </span>
        ))}
        {lista.length > max && (
          <span style={{ fontSize: tamanho * 0.6, color: 'var(--cor-texto-suave)', fontWeight: 600 }}>+{lista.length - max}</span>
        )}
      </span>
    );
  };

  const irParaHoje = () => {
    setDiaSelecionado(hoje);
    setMesVisivel({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
    setModo('dia');
  };

  const abrirMes = () => {
    setMesVisivel({ ano: diaSelecionado.getFullYear(), mes: diaSelecionado.getMonth() });
    setModo('mes');
  };

  const selecionarDia = (data: Date) => {
    setDiaSelecionado(data);
    setModo('dia');
  };

  const irParaMes = (delta: number) =>
    setMesVisivel((m) => {
      const d = new Date(m.ano, m.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });

  // ---- Visão de dia (faixa da semana + linha do tempo) ----
  const inicioSemana = somarDias(diaSelecionado, -diaSelecionado.getDay());
  const semana = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));

  const feriadoSelecionado = feriado(diaSelecionado);
  const blocos = aulasDoDia(diaSelecionado).map((aula) => ({
    ...aula,
    inicio: emMinutos(aula.horario.horaInicio),
    fim: emMinutos(aula.horario.horaFim),
  }));
  const horaInicio = 0;
  const horas = Array.from({ length: 24 }, (_, i) => i);
  const rotuloDia = capitalizar(diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }));
  const ehHojeSelecionado = mesmoDia(diaSelecionado, agora);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const visaoDia = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button
          className="btn btn--ghost btn--sm"
          onClick={abrirMes}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
        >
          <ChevronLeft size={16} /> {capitalizar(diaSelecionado.toLocaleDateString('pt-BR', { month: 'long' }))}
        </button>
        <button className="btn btn--secundario btn--sm" onClick={irParaHoje}>
          Hoje
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginTop: 8, gap: 2 }}>
        {semana.map((data, i) => {
          const selecionado = mesmoDia(data, diaSelecionado);
          const ehHoje = mesmoDia(data, hoje);
          return (
            <button
              key={i}
              onClick={() => setDiaSelecionado(data)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '6px 0',
                border: 'none',
                borderRadius: 'var(--raio)',
                cursor: 'pointer',
                background: selecionado && !ehHoje ? 'color-mix(in srgb, var(--cor-primaria) 16%, transparent)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cor-texto-suave)' }}>{DIAS_CABECALHO[i]}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  fontSize: 14,
                  fontWeight: ehHoje ? 700 : 500,
                  background: ehHoje ? 'var(--cor-primaria)' : 'transparent',
                  color: ehHoje ? 'var(--cor-sobre-primaria)' : feriado(data) ? 'var(--cor-erro)' : 'var(--cor-texto)',
                }}
              >
                {data.getDate()}
              </span>
              <span style={{ marginTop: 2 }}>{iniciais(data, 3, 15)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--cor-borda)', marginTop: 8, paddingTop: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 15 }}>{rotuloDia}</strong>
          {feriadoSelecionado && (
            <span style={{ fontWeight: 600, color: 'var(--cor-erro)', fontSize: 13 }}>Feriado — {feriadoSelecionado}</span>
          )}
        </div>

        <div ref={trilhaRef} style={{ display: 'flex', flex: 1, minHeight: 0, marginTop: 12, paddingTop: 8, overflowY: 'auto' }}>
            <div style={{ width: 48, flexShrink: 0, height: ALTURA_HORA * 24, display: 'flex', flexDirection: 'column' }}>
              {horas.map((h) => (
                <div key={h} style={{ height: ALTURA_HORA, flexShrink: 0, position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -7, right: 8, fontSize: 12, color: 'var(--cor-texto-suave)' }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, position: 'relative', height: ALTURA_HORA * 24, borderLeft: '1px solid var(--cor-borda)', display: 'flex', flexDirection: 'column' }}>
              {horas.map((h) => (
                <div key={h} style={{ height: ALTURA_HORA, flexShrink: 0, borderBottom: '1px solid var(--cor-borda)' }} />
              ))}
              {blocos.map((bloco) => {
                const topico = topicosPorDisciplina[bloco.disciplina.id]?.[chaveData(diaSelecionado)];
                return (
                  <button
                    key={`${bloco.disciplina.id}-${bloco.horario.id}`}
                    onClick={() => setAulaAberta({ disciplina: bloco.disciplina, horario: bloco.horario, data: diaSelecionado })}
                    style={{
                      position: 'absolute',
                      top: ((bloco.inicio - horaInicio * 60) / 60) * ALTURA_HORA,
                      height: Math.max(((bloco.fim - bloco.inicio) / 60) * ALTURA_HORA, ALTURA_MIN_BLOCO),
                      left: 6,
                      right: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      gap: 1,
                      textAlign: 'left',
                      background: bloco.cor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: 'var(--sombra)',
                    }}
                  >
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bloco.disciplina.nome}</div>
                    <div style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bloco.horario.horaInicio}–{bloco.horario.horaFim}
                      {bloco.disciplina.sala ? ` · ${bloco.disciplina.sala}` : ''}
                    </div>
                    {bloco.disciplina.professor && (
                      <div style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bloco.disciplina.professor}
                      </div>
                    )}
                    {topico && (
                      <div style={{ opacity: 0.85, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {topico}
                      </div>
                    )}
                  </button>
                );
              })}
              {ehHojeSelecionado && (
                <div
                  style={{
                    position: 'absolute',
                    top: (minutosAgora / 60) * ALTURA_HORA,
                    left: 0,
                    right: 0,
                    height: 0,
                    borderTop: '2px solid var(--cor-erro)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: -4,
                      top: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--cor-erro)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
      </div>
    </>
  );

  // ---- Visão de mês (grade) ----
  const celulas = useMemo(() => {
    const primeiro = new Date(mesVisivel.ano, mesVisivel.mes, 1);
    const inicio = somarDias(primeiro, -primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const data = somarDias(inicio, i);
      return {
        data,
        doMes: data.getMonth() === mesVisivel.mes,
        ehHoje: mesmoDia(data, hoje),
        ehFeriado: !!feriado(data),
      };
    });
  }, [mesVisivel, hoje]);

  const rotuloMes = capitalizar(
    new Date(mesVisivel.ano, mesVisivel.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );

  const visaoMes = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn--ghost btn--sm" title="Mês anterior" onClick={() => irParaMes(-1)}>
            <ChevronLeft size={18} />
          </button>
          <strong style={{ minWidth: 150, textAlign: 'center' }}>{rotuloMes}</strong>
          <button className="btn btn--ghost btn--sm" title="Próximo mês" onClick={() => irParaMes(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="btn btn--secundario btn--sm" onClick={irParaHoje}>
          Hoje
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginTop: 8 }}>
        {DIAS_CABECALHO.map((dia, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 600, color: 'var(--cor-texto-suave)' }}>
            {dia}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 2, flex: 1, minHeight: 0 }}>
        {celulas.map((celula, i) => {
          const selecionado = mesmoDia(celula.data, diaSelecionado);
          return (
            <button
              key={i}
              onClick={() => selecionarDia(celula.data)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 3,
                padding: '6px 0 4px',
                border: 'none',
                borderRadius: 'var(--raio)',
                cursor: 'pointer',
                background: selecionado ? 'color-mix(in srgb, var(--cor-primaria) 16%, transparent)' : 'transparent',
                opacity: celula.doMes ? 1 : 0.4,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  fontSize: 13,
                  fontWeight: celula.ehHoje ? 700 : 500,
                  background: celula.ehHoje ? 'var(--cor-primaria)' : 'transparent',
                  color: celula.ehHoje
                    ? 'var(--cor-sobre-primaria)'
                    : !celula.doMes
                      ? 'var(--cor-texto-suave)'
                      : celula.ehFeriado
                        ? 'var(--cor-erro)'
                        : 'var(--cor-texto)',
                }}
              >
                {celula.data.getDate()}
              </span>
              <span style={{ marginTop: 4 }}>{iniciais(celula.data, 4)}</span>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Agenda</h1>
        <div style={{ minWidth: 240 }}>
          <SelectInput
            value={disciplinaId}
            options={todasDisciplinas.map((d) => ({ value: d.id, label: d.nome }))}
            placeholder="Todas as disciplinas"
            onChange={setDisciplinaId}
          />
        </div>
      </header>

      {todasDisciplinas.length === 0 ? (
        <p style={{ color: 'var(--cor-texto-suave)' }}>Você ainda não participa de nenhuma disciplina.</p>
      ) : (
        <div className="card" style={{ padding: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {modo === 'dia' ? visaoDia : visaoMes}
        </div>
      )}

      {aulaAberta && (
        <AulaDetalheModal
          disciplinaId={aulaAberta.disciplina.id}
          disciplina={aulaAberta.disciplina}
          onFechar={() => {
            setAulaAberta(null);
            setRecargaTopicos((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
