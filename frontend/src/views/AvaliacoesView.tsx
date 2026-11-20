import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '../service/Api';
import { useToast } from '../toast/ToastContext';
import { MultiSelect } from '../components/utils';
import { Row, Col } from '../components/Grid';
import FormGroup from '../components/FormGroup';
import BoldLabel from '../components/BoldLabel';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import DateInput from '../components/DateInput';
import { showError } from '../components/Messages';

interface AvaliacaoResp {
  id: string;
  nome: string;
  data: string | null;
  pontuacaoMaxima: number;
  minhaNota: number | null;
}
interface DisciplinaResp {
  id: string;
  nome: string;
  professor: string | null;
  pontuacaoAtual: number;
  avaliacoes: AvaliacaoResp[];
}

const formVazio = { id: '', disciplinaId: '', nome: '', data: '', pontuacaoMaxima: '' };

const normalizar = (raw: string): string => raw.replace(/[^\d,.-]/g, '').replace(',', '.');

const formatarData = (iso: string | null): string => {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

const formatarNota = (n: number): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function AvaliacoesView() {
  const { showSuccess, showConfirm } = useToast();
  const [disciplinas, setDisciplinas] = useState<DisciplinaResp[]>([]);
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<string[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [notaDraft, setNotaDraft] = useState<Record<string, string>>({});

  const editando = !!form.id;

  const carregar = useCallback(() => {
    api
      .getAll<{ items: DisciplinaResp[] }>('/disciplinas?pageSize=100')
      .then((pagina) => setDisciplinas(pagina.items ?? []))
      .catch(() => setDisciplinas([]));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const inicial: Record<string, string> = {};
    for (const d of disciplinas) {
      for (const a of d.avaliacoes) {
        inicial[a.id] = a.minhaNota != null ? String(a.minhaNota) : '';
      }
    }
    setNotaDraft(inicial);
  }, [disciplinas]);

  const opcoesDisciplinas = useMemo(
    () => disciplinas.map((d) => ({ value: d.id, label: d.nome })),
    [disciplinas],
  );

  const disciplinasVisiveis = useMemo(() => {
    if (disciplinasSelecionadas.length === 0) return disciplinas;
    return disciplinas.filter((d) => disciplinasSelecionadas.includes(d.id));
  }, [disciplinas, disciplinasSelecionadas]);

  const totalAvaliacoes = disciplinasVisiveis.reduce((soma, d) => soma + d.avaliacoes.length, 0);

  const abrirNovo = () => {
    setForm(formVazio);
    setMostrarForm(true);
  };

  const abrirEdicao = (disciplinaId: string, avaliacao: AvaliacaoResp) => {
    setForm({
      id: avaliacao.id,
      disciplinaId,
      nome: avaliacao.nome,
      data: avaliacao.data ? avaliacao.data.slice(0, 10) : '',
      pontuacaoMaxima: String(avaliacao.pontuacaoMaxima),
    });
    setMostrarForm(true);
  };

  const fecharForm = () => {
    setMostrarForm(false);
    setForm(formVazio);
  };

  const salvar = async () => {
    if (!form.disciplinaId) {
      showError('Selecione a disciplina.');
      return;
    }
    if (!form.nome.trim()) {
      showError('Informe o nome da avaliação.');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        data: form.data || undefined,
        pontuacaoMaxima: Number(form.pontuacaoMaxima || 0),
      };
      if (editando) {
        await api.put(`/disciplinas/${form.disciplinaId}/avaliacoes/${form.id}`, payload);
        showSuccess('Avaliação atualizada.');
      } else {
        await api.post(`/disciplinas/${form.disciplinaId}/avaliacoes`, payload);
        showSuccess('Avaliação cadastrada.');
      }
      fecharForm();
      carregar();
    } catch {
      // erro já reportado pela Api
    } finally {
      setSalvando(false);
    }
  };

  const excluir = (disciplinaId: string, avaliacaoId: string) => {
    showConfirm('Deseja realmente excluir esta avaliação? As notas lançadas por todos serão perdidas.', async () => {
      try {
        await api.delete(`/disciplinas/${disciplinaId}/avaliacoes/${avaliacaoId}`);
        showSuccess('Avaliação excluída.');
        carregar();
      } catch {
        // erro já reportado pela Api
      }
    });
  };

  const salvarNota = async (disciplinaId: string, avaliacao: AvaliacaoResp) => {
    const raw = (notaDraft[avaliacao.id] ?? '').trim();
    try {
      if (raw === '') {
        await api.delete(`/disciplinas/${disciplinaId}/avaliacoes/${avaliacao.id}/nota`);
      } else {
        await api.put(`/disciplinas/${disciplinaId}/avaliacoes/${avaliacao.id}/nota`, {
          pontuacaoObtida: Number(raw),
        });
      }
      showSuccess('Nota salva.');
      carregar();
    } catch {
      // erro já reportado pela Api
    }
  };

  const notaAlterada = (a: AvaliacaoResp): boolean => {
    const original = a.minhaNota != null ? String(a.minhaNota) : '';
    return (notaDraft[a.id] ?? '') !== original;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Avaliações</h1>

        {disciplinas.length > 0 && (
          <div className="filtro-compacto" style={{ minWidth: 240 }}>
            <MultiSelect
              name="disciplinas"
              values={disciplinasSelecionadas}
              options={opcoesDisciplinas}
              onChange={setDisciplinasSelecionadas}
              placeholder="Todas as disciplinas"
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {disciplinas.length > 0 && (
          <button
            className="btn btn--primario btn--sm"
            onClick={abrirNovo}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Cadastrar avaliação
          </button>
        )}
      </header>

      {mostrarForm && (
        <div className="u-modal-overlay" onClick={fecharForm}>
          <div className="u-modal u-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="u-modal__header">
              <div>
                <div className="u-modal__titulo">{editando ? 'Editar avaliação' : 'Nova avaliação'}</div>
                <div className="u-modal__desc">
                  {editando ? 'Atualize os dados da avaliação.' : 'Preencha os dados da nova avaliação.'}
                </div>
              </div>
              <button type="button" className="u-modal__fechar" title="Fechar" onClick={fecharForm}>
                <X size={16} />
              </button>
            </div>
            <div className="u-modal__body">
              <Row>
                <Col sm={12} md={12} lg={12} xl={12}>
                  <FormGroup>
                    <BoldLabel obrigatorio>Disciplina</BoldLabel>
                    <SelectInput
                      value={form.disciplinaId}
                      options={opcoesDisciplinas}
                      placeholder="Selecione uma disciplina…"
                      disabled={editando}
                      onChange={(v) => setForm((f) => ({ ...f, disciplinaId: v }))}
                    />
                  </FormGroup>
                </Col>
                <Col sm={12} md={12} lg={12} xl={12}>
                  <FormGroup>
                    <BoldLabel obrigatorio>Nome</BoldLabel>
                    <TextInput value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} />
                  </FormGroup>
                </Col>
                <Col sm={12} md={6} lg={6} xl={6}>
                  <FormGroup>
                    <BoldLabel>Data</BoldLabel>
                    <DateInput value={form.data} onChange={(v) => setForm((f) => ({ ...f, data: v }))} />
                  </FormGroup>
                </Col>
                <Col sm={12} md={6} lg={6} xl={6}>
                  <FormGroup>
                    <BoldLabel>Pontuação máxima</BoldLabel>
                    <TextInput
                      type="number"
                      value={form.pontuacaoMaxima}
                      onChange={(v) => setForm((f) => ({ ...f, pontuacaoMaxima: v }))}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </div>
            <div className="u-modal__footer">
              <button className="btn btn--secundario btn--sm" onClick={fecharForm}>
                Cancelar
              </button>
              <button className="btn btn--primario btn--sm" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {disciplinas.length === 0 ? (
        <p style={{ color: 'var(--cor-texto-suave)' }}>Você ainda não participa de nenhuma disciplina.</p>
      ) : totalAvaliacoes === 0 ? (
        <p style={{ color: 'var(--cor-texto-suave)' }}>Nenhuma avaliação cadastrada para as disciplinas selecionadas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {disciplinasVisiveis.map((disciplina) => (
            <div key={disciplina.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--cor-borda)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{disciplina.nome}</div>
                  {disciplina.professor && (
                    <div style={{ fontSize: 12, color: 'var(--cor-texto-suave)' }}>{disciplina.professor}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--cor-texto-suave)', whiteSpace: 'nowrap' }}>
                  Minha pontuação: <strong style={{ color: 'var(--cor-texto)' }}>{formatarNota(disciplina.pontuacaoAtual)}</strong>
                </div>
              </div>

              {disciplina.avaliacoes.length === 0 ? (
                <p style={{ color: 'var(--cor-texto-suave)', fontSize: 13, padding: '12px 16px', margin: 0 }}>
                  Sem avaliações.
                </p>
              ) : (
                <>
                <div className="aval-desktop tabela-wrapper">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Avaliação</th>
                        <th>Data</th>
                        <th className="num">Máxima</th>
                        <th style={{ width: 200 }}>Minha nota</th>
                        <th className="acoes" />
                      </tr>
                    </thead>
                    <tbody>
                      {disciplina.avaliacoes.map((a) => (
                        <tr key={a.id}>
                          <td>{a.nome}</td>
                          <td>{formatarData(a.data)}</td>
                          <td className="num">{formatarNota(a.pontuacaoMaxima)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                className="input input--numerico"
                                inputMode="decimal"
                                placeholder="—"
                                style={{ height: 32, width: 100, padding: '4px 8px' }}
                                value={notaDraft[a.id] ?? ''}
                                onChange={(e) =>
                                  setNotaDraft((n) => ({ ...n, [a.id]: normalizar(e.target.value) }))
                                }
                                onKeyDown={(e) => e.key === 'Enter' && notaAlterada(a) && salvarNota(disciplina.id, a)}
                              />
                              <button
                                className="btn btn--primario btn--sm"
                                title="Salvar minha nota"
                                disabled={!notaAlterada(a)}
                                onClick={() => salvarNota(disciplina.id, a)}
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          </td>
                          <td className="acoes">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                className="btn btn--ghost btn--sm"
                                title="Editar avaliação"
                                onClick={() => abrirEdicao(disciplina.id, a)}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className="btn btn--ghost btn--sm"
                                style={{ color: 'var(--cor-erro)' }}
                                title="Excluir avaliação"
                                onClick={() => excluir(disciplina.id, a.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="aval-mobile">
                  {disciplina.avaliacoes.map((a) => (
                    <div key={a.id} className="aval-mobile__item">
                      <div className="aval-mobile__top">
                        <div className="aval-mobile__nome">{a.nome}</div>
                        <div className="aval-mobile__acoes">
                          <button
                            className="btn btn--ghost btn--sm"
                            title="Editar avaliação"
                            onClick={() => abrirEdicao(disciplina.id, a)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ color: 'var(--cor-erro)' }}
                            title="Excluir avaliação"
                            onClick={() => excluir(disciplina.id, a.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="aval-mobile__meta">
                        <span>Data: <strong>{formatarData(a.data)}</strong></span>
                        <span>Máxima: <strong>{formatarNota(a.pontuacaoMaxima)}</strong></span>
                      </div>
                      <div className="aval-mobile__nota">
                        <span className="aval-mobile__nota-label">Minha nota:</span>
                        <input
                          className="input input--numerico"
                          inputMode="decimal"
                          placeholder="—"
                          value={notaDraft[a.id] ?? ''}
                          onChange={(e) =>
                            setNotaDraft((n) => ({ ...n, [a.id]: normalizar(e.target.value) }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && notaAlterada(a) && salvarNota(disciplina.id, a)}
                        />
                        <button
                          className="btn btn--primario btn--sm"
                          title="Salvar minha nota"
                          disabled={!notaAlterada(a)}
                          onClick={() => salvarNota(disciplina.id, a)}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
