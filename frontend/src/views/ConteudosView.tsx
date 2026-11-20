import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, Trash2 } from 'lucide-react';
import api from '../service/Api';
import SelectInput from '../components/SelectInput';
import { useAuth } from '../context/authContext';
import { useToast } from '../toast/ToastContext';
import { showError } from '../components/Messages';
import { urlDoArquivo } from '../service/arquivos';
import { type ItemEnum } from '../utils/enum';

const PAPEL_DONO = 1;
const TIPO_TEXTO = 1;
const TIPO_LINK = 2;
const TIPO_IMAGEM = 3;
const MAX_MB = 5;

interface DisciplinaLista {
  id: string;
  nome: string;
  papelDoUsuario: ItemEnum | null;
}

interface Conteudo {
  id: string;
  tipo: ItemEnum | null;
  texto: string | null;
  link: string | null;
  arquivoId: string | null;
  usuarioId: string;
  autorNome: string | null;
  autorEmail: string;
  criadoEm: string;
}

// image/png -> png, image/jpeg -> jpg.
function extensaoDoMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  const barra = mime.indexOf('/');
  return barra >= 0 ? mime.slice(barra + 1) : 'bin';
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const ehUrl = (texto: string): boolean => /^https?:\/\/\S+$/i.test(texto.trim());

const formatarHora = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Imagem de um conteúdo: carrega o blob autenticado e o revoga ao desmontar.
function ImagemConteudo({ arquivoId }: { arquivoId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let ativa: string | null = null;
    urlDoArquivo(arquivoId)
      .then((u) => {
        if (cancelado) {
          URL.revokeObjectURL(u);
          return;
        }
        ativa = u;
        setUrl(u);
      })
      .catch(() => setUrl(null));
    return () => {
      cancelado = true;
      if (ativa) URL.revokeObjectURL(ativa);
    };
  }, [arquivoId]);

  if (!url) {
    return <div style={{ width: 180, height: 120, borderRadius: 8, background: 'var(--cor-borda)' }} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img
        src={url}
        alt="Imagem"
        style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: 'block' }}
      />
    </a>
  );
}

export default function ConteudosView() {
  const { usuario } = useAuth();
  const { showConfirm } = useToast();
  const meuId = usuario?.usuarioId;

  const [disciplinas, setDisciplinas] = useState<DisciplinaLista[]>([]);
  const [disciplinaId, setDisciplinaId] = useState<string>('');
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  const inputImagemRef = useRef<HTMLInputElement>(null);

  const disciplinaAtual = disciplinas.find((d) => d.id === disciplinaId) ?? null;
  const souDono = disciplinaAtual?.papelDoUsuario?.id === PAPEL_DONO;

  useEffect(() => {
    api
      .getAll<{ items: DisciplinaLista[] }>('/disciplinas?pageSize=100')
      .then((pagina) => {
        const itens = pagina.items ?? [];
        setDisciplinas(itens);
        // Seleciona a primeira disciplina automaticamente.
        setDisciplinaId((atual) => atual || (itens[0]?.id ?? ''));
      })
      .catch(() => setDisciplinas([]));
  }, []);

  const carregar = useCallback(() => {
    if (!disciplinaId) {
      setConteudos([]);
      return;
    }
    api
      .getAll<Conteudo[]>(`/disciplinas/${disciplinaId}/conteudos`, false, false, false)
      .then((lista) => setConteudos(Array.isArray(lista) ? lista : []))
      .catch(() => setConteudos([]));
  }, [disciplinaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Rola para o fim ao carregar/mudar a lista.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' });
  }, [conteudos]);

  const postar = async (corpo: Record<string, unknown>) => {
    if (!disciplinaId) return;
    setEnviando(true);
    try {
      await api.post(`/disciplinas/${disciplinaId}/conteudos`, corpo);
      carregar();
    } catch {
      // erro já reportado pela Api
    } finally {
      setEnviando(false);
    }
  };

  const enviarTexto = async () => {
    const valor = texto.trim();
    if (!valor) return;
    setTexto('');
    if (ehUrl(valor)) {
      await postar({ tipo: TIPO_LINK, link: valor });
    } else {
      await postar({ tipo: TIPO_TEXTO, texto: valor });
    }
  };

  const enviarImagem = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const file = evento.target.files?.[0];
    evento.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      showError(`A imagem deve ter no máximo ${MAX_MB} MB.`);
      return;
    }
    setEnviando(true);
    try {
      const conteudo = await lerComoBase64(file);
      const arquivo = await api.post<{ id: string }>('/arquivos', {
        nome: file.name,
        extensao: extensaoDoMime(file.type),
        mimeType: file.type,
        conteudo,
      });
      await api.patch(`/arquivos/${arquivo.id}/permanente`);
      await postar({ tipo: TIPO_IMAGEM, arquivoId: arquivo.id });
    } catch {
      // erro já reportado pela Api
    } finally {
      setEnviando(false);
    }
  };

  const excluir = (conteudo: Conteudo) => {
    showConfirm('Deseja realmente excluir este conteúdo?', async () => {
      try {
        await api.delete(`/disciplinas/${disciplinaId}/conteudos/${conteudo.id}`);
        carregar();
      } catch {
        // erro já reportado pela Api
      }
    });
  };

  const nomeAutor = (c: Conteudo) => c.autorNome || c.autorEmail || 'Usuário';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Conteúdos</h1>
        <div style={{ minWidth: 240 }}>
          <SelectInput
            value={disciplinaId}
            options={disciplinas.map((d) => ({ value: d.id, label: d.nome }))}
            placeholder="Selecione uma disciplina…"
            onChange={setDisciplinaId}
          />
        </div>
      </header>

      {disciplinas.length === 0 ? (
        <p style={{ color: 'var(--cor-texto-suave)' }}>Você ainda não participa de nenhuma disciplina.</p>
      ) : !disciplinaId ? (
        <p style={{ color: 'var(--cor-texto-suave)' }}>Selecione uma disciplina para ver os conteúdos.</p>
      ) : (
        <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conteudos.length === 0 ? (
              <p style={{ color: 'var(--cor-texto-suave)', textAlign: 'center', margin: 'auto' }}>
                Nenhum conteúdo ainda. Envie o primeiro!
              </p>
            ) : (
              conteudos.map((c) => {
                const meu = c.usuarioId === meuId;
                const podeExcluir = meu || souDono;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: meu ? 'flex-end' : 'flex-start',
                      maxWidth: '100%',
                    }}
                  >
                    {!meu && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cor-primaria)', marginBottom: 2 }}>
                        {nomeAutor(c)}
                      </span>
                    )}
                    <div
                      style={{
                        maxWidth: 'min(78%, 460px)',
                        padding: '8px 12px',
                        borderRadius: 12,
                        borderTopRightRadius: meu ? 2 : 12,
                        borderTopLeftRadius: meu ? 12 : 2,
                        background: meu ? 'var(--cor-primaria)' : 'var(--cor-fundo)',
                        color: meu ? '#fff' : 'var(--cor-texto)',
                        border: meu ? 'none' : '1px solid var(--cor-borda)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {c.tipo?.id === TIPO_IMAGEM && c.arquivoId ? (
                        <ImagemConteudo arquivoId={c.arquivoId} />
                      ) : c.tipo?.id === TIPO_LINK && c.link ? (
                        <a
                          href={c.link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: meu ? '#fff' : 'var(--cor-primaria)', textDecoration: 'underline', wordBreak: 'break-all' }}
                        >
                          {c.link}
                        </a>
                      ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{c.texto}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--cor-texto-suave)' }}>{formatarHora(c.criadoEm)}</span>
                      {podeExcluir && (
                        <button
                          className="btn btn--ghost btn--sm"
                          title="Excluir"
                          style={{ color: 'var(--cor-erro)', padding: 2, height: 'auto' }}
                          onClick={() => excluir(c)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={fimRef} />
          </div>

          {/* Composer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderTop: '1px solid var(--cor-borda)',
              background: 'var(--cor-superficie, var(--cor-fundo))',
            }}
          >
            <input ref={inputImagemRef} type="file" accept="image/*" onChange={enviarImagem} style={{ display: 'none' }} />
            <button
              className="btn btn--secundario btn--sm"
              title="Anexar imagem"
              disabled={enviando}
              onClick={() => inputImagemRef.current?.click()}
            >
              <ImagePlus size={18} />
            </button>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Escreva uma mensagem ou cole um link…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarTexto();
                }
              }}
            />
            <button
              className="btn btn--primario btn--sm"
              title="Enviar"
              disabled={enviando || !texto.trim()}
              onClick={enviarTexto}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
