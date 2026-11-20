import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../service/Api';
import { useToast } from '../toast/ToastContext';
import { type ItemEnum, PAPEL_DISCIPLINA_DONO, SITUACAO_MEMBRO_PENDENTE } from '../utils/enum';

interface Membro {
  usuarioId: string;
  nome: string | null;
  email: string;
  papel: ItemEnum | null;
  situacao: ItemEnum | null;
  criadoEm: string;
}

/** Painel do dono: aprovar/recusar solicitações e listar/remover membros. */
export default function DisciplinaMembros({ disciplinaId }: { disciplinaId: string }) {
  const { showSuccess } = useToast();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .getAll<Membro[]>(`/disciplinas/${disciplinaId}/membros`, false, false, false)
      .then((lista) => setMembros(Array.isArray(lista) ? lista : []))
      .catch(() => setMembros([]))
      .finally(() => setCarregando(false));
  }, [disciplinaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aprovar = async (usuarioId: string) => {
    setProcessando(usuarioId);
    try {
      await api.post(`/disciplinas/${disciplinaId}/membros/${usuarioId}/aprovar`, {});
      showSuccess('Solicitação aprovada.');
      carregar();
    } catch {
      // erro já reportado pela Api
    } finally {
      setProcessando(null);
    }
  };

  const remover = async (usuarioId: string) => {
    setProcessando(usuarioId);
    try {
      await api.delete(`/disciplinas/${disciplinaId}/membros/${usuarioId}`);
      carregar();
    } catch {
      // erro já reportado pela Api
    } finally {
      setProcessando(null);
    }
  };

  const pendentes = membros.filter((m) => m.situacao?.id === SITUACAO_MEMBRO_PENDENTE);
  const ativos = membros.filter((m) => m.situacao?.id !== SITUACAO_MEMBRO_PENDENTE);

  const nomeExibicao = (m: Membro) => m.nome || m.email || 'Usuário';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section>
        <h4 style={{ margin: '0 0 8px' }}>
          Solicitações pendentes{pendentes.length > 0 && ` (${pendentes.length})`}
        </h4>
        {carregando ? (
          <p style={{ color: 'var(--cor-texto-suave)', fontSize: 13 }}>Carregando…</p>
        ) : pendentes.length === 0 ? (
          <p style={{ color: 'var(--cor-texto-suave)', fontSize: 13 }}>Nenhuma solicitação pendente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendentes.map((m) => (
              <div key={m.usuarioId} style={linhaEstilo}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomeExibicao(m)}</div>
                  <div style={{ fontSize: 12, color: 'var(--cor-texto-suave)' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn--primario btn--sm"
                    title="Aprovar"
                    disabled={processando === m.usuarioId}
                    onClick={() => aprovar(m.usuarioId)}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ color: 'var(--cor-erro)' }}
                    title="Recusar"
                    disabled={processando === m.usuarioId}
                    onClick={() => remover(m.usuarioId)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>Membros{ativos.length > 0 && ` (${ativos.length})`}</h4>
        {ativos.length === 0 ? (
          <p style={{ color: 'var(--cor-texto-suave)', fontSize: 13 }}>Nenhum membro ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ativos.map((m) => {
              const ehDono = m.papel?.id === PAPEL_DISCIPLINA_DONO;
              return (
                <div key={m.usuarioId} style={linhaEstilo}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nomeExibicao(m)}
                      {ehDono && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 999,
                            background: 'color-mix(in srgb, var(--cor-primaria) 14%, transparent)',
                            color: 'var(--cor-primaria)',
                            fontWeight: 700,
                          }}
                        >
                          DONO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cor-texto-suave)' }}>{m.email}</div>
                  </div>
                  {!ehDono && (
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--cor-erro)' }}
                      title="Remover da disciplina"
                      disabled={processando === m.usuarioId}
                      onClick={() => remover(m.usuarioId)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const linhaEstilo: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--cor-borda)',
  background: 'var(--cor-fundo)',
};
