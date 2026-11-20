import { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  updatePassword,
} from 'firebase/auth';
import { KeyRound } from 'lucide-react';
import { firebaseAuth } from '../firebase';
import api from '../service/Api';
import { useAuth } from '../context/authContext';
import { useToast } from '../toast/ToastContext';
import { PasswordInput } from '../components/utils';
import { Row, Col } from '../components/Grid';
import FormGroup from '../components/FormGroup';
import BoldLabel from '../components/BoldLabel';
import TextInput from '../components/TextInput';
import DateInput from '../components/DateInput';
import FotoInput from '../components/FotoInput';

// "G" colorido do Google para o ícone de status. Sem dependência externa.
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

interface Perfil {
  email: string;
  nome: string | null;
  dataNascimento: string | null;
  fotoArquivoId: string | null;
}

interface MinhaDisciplina {
  id: string;
  codigo: string | null;
  nome: string;
  professor: string | null;
  papelDoUsuario: { id?: number } | null;
}

const PAPEL_DONO = 1;

export default function ConfiguracoesView() {
  const { showError, showSuccess, showConfirm } = useToast();
  const { atualizarUsuario } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [googleVinculado, setGoogleVinculado] = useState<boolean | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const [senhaVinculada, setSenhaVinculada] = useState<boolean | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [definindoSenha, setDefinindoSenha] = useState(false);

  const [fotoArquivoId, setFotoArquivoId] = useState<string | null>(null);

  const [disciplinas, setDisciplinas] = useState<MinhaDisciplina[]>([]);

  const [alterarSenha, setAlterarSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  useEffect(() => {
    api
      .get<Perfil>('/perfil')
      .then((p) => {
        setPerfil(p);
        setNome(p.nome ?? '');
        setDataNascimento(p.dataNascimento ?? '');
        setFotoArquivoId(p.fotoArquivoId);
      })
      .catch(() => {});
  }, []);

  const carregarDisciplinas = () =>
    api
      .getAll<{ items: MinhaDisciplina[] }>('/disciplinas?pageSize=100')
      .then((pagina) => setDisciplinas(pagina.items ?? []))
      .catch(() => setDisciplinas([]));

  useEffect(() => {
    carregarDisciplinas();
  }, []);

  const sairDaDisciplina = (disciplina: MinhaDisciplina) => {
    showConfirm(`Deseja realmente sair de "${disciplina.nome}"?`, async () => {
      try {
        await api.delete(`/disciplinas/${disciplina.id}/sair`);
        showSuccess('Você saiu da disciplina.');
        carregarDisciplinas();
      } catch {
        // erro já reportado pela Api
      }
    });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setGoogleVinculado(user ? user.providerData.some((p) => p.providerId === 'google.com') : false);
      setSenhaVinculada(user ? user.providerData.some((p) => p.providerId === 'password') : false);
    });
    return unsub;
  }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      const atualizado = await api.put<Perfil>('/perfil', { nome, dataNascimento: dataNascimento || undefined });
      setPerfil(atualizado);
      showSuccess('Perfil salvo!');
    } catch {
      // erro já reportado pela Api
    } finally {
      setSalvando(false);
    }
  };

  const vincularGoogle = async () => {
    if (!firebaseAuth.currentUser) {
      showError('Sessão do Google indisponível. Entre novamente para vincular.');
      return;
    }
    setVinculando(true);
    try {
      await linkWithPopup(firebaseAuth.currentUser, new GoogleAuthProvider());
      setGoogleVinculado(true);
      showSuccess('Conta Google vinculada!');
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? '';
      if (codigo === 'auth/credential-already-in-use' || codigo === 'auth/provider-already-linked') {
        setGoogleVinculado(true);
        showError('Esta conta Google já está vinculada.');
      } else {
        showError('Não foi possível vincular a conta Google.');
      }
    } finally {
      setVinculando(false);
    }
  };

  const definirSenha = async () => {
    const user = firebaseAuth.currentUser;
    if (!user || !user.email) {
      showError('Sessão indisponível. Entre novamente para definir a senha.');
      return;
    }
    if (novaSenha.length < 6) {
      showError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setDefinindoSenha(true);
    try {
      // Anexa o provedor de senha à conta atual (Google): mesmo firebaseUid,
      // passando a aceitar login por e-mail/senha também.
      const cred = EmailAuthProvider.credential(user.email, novaSenha);
      await linkWithCredential(user, cred);
      setSenhaVinculada(true);
      setNovaSenha('');
      showSuccess('Senha definida! Agora você também entra com e-mail e senha.');
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? '';
      if (codigo === 'auth/requires-recent-login') {
        showError('Por segurança, entre novamente com o Google antes de definir a senha.');
      } else if (codigo === 'auth/provider-already-linked' || codigo === 'auth/email-already-in-use') {
        setSenhaVinculada(true);
        showError('Este acesso por senha já está configurado.');
      } else {
        showError('Não foi possível definir a senha.');
      }
    } finally {
      setDefinindoSenha(false);
    }
  };

  const trocarFoto = async (arquivoId: string) => {
    try {
      await api.put('/perfil', { fotoDePerfilId: arquivoId });
      setFotoArquivoId(arquivoId);
      atualizarUsuario({ fotoArquivoId: arquivoId }); // reflete no UserMenu
      showSuccess('Foto de perfil atualizada!');
    } catch {
      // erro já reportado pela Api
    }
  };

  const salvarNovaSenha = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      showError('Sessão indisponível. Entre novamente para alterar a senha.');
      return;
    }
    if (alterarSenha.length < 6) {
      showError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (alterarSenha !== confirmarSenha) {
      showError('As senhas não coincidem.');
      return;
    }
    setAlterandoSenha(true);
    try {
      await updatePassword(user, alterarSenha);
      setAlterarSenha('');
      setConfirmarSenha('');
      showSuccess('Senha alterada!');
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? '';
      if (codigo === 'auth/requires-recent-login') {
        showError('Por segurança, entre novamente antes de alterar a senha.');
      } else if (codigo === 'auth/weak-password') {
        showError('Senha muito fraca.');
      } else {
        showError('Não foi possível alterar a senha.');
      }
    } finally {
      setAlterandoSenha(false);
    }
  };

  const iniciais = (perfil?.email ?? 'U').slice(0, 2).toUpperCase();

  // Ícone de status: verde quando ativo; realçado/clicável quando é uma ação
  // pendente (ex.: Google não vinculado); apagado quando só informativo.
  const estiloStatus = (ativo: boolean, acaoPendente: boolean): React.CSSProperties => ({
    width: 34,
    height: 34,
    padding: 0,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${ativo ? 'var(--cor-sucesso, #22c55e)' : 'var(--cor-borda)'}`,
    background: ativo ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
    cursor: acaoPendente ? 'pointer' : 'default',
    opacity: ativo || acaoPendente ? 1 : 0.55,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
      <div className="card" style={{ width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Perfil</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--cor-texto-suave)' }}>Seus dados pessoais.</p>
          </div>
          {/* Status da conta: só ícones. Google é clicável quando não vinculado. */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={googleVinculado ? undefined : vincularGoogle}
              disabled={googleVinculado !== false || vinculando}
              title={
                googleVinculado === null
                  ? 'Verificando conta Google…'
                  : googleVinculado
                    ? 'Conta Google vinculada'
                    : 'Vincular conta Google'
              }
              style={estiloStatus(googleVinculado === true, googleVinculado === false)}
            >
              <GoogleGlyph size={18} />
            </button>
            <span
              title={
                senhaVinculada === null
                  ? 'Verificando acesso por senha…'
                  : senhaVinculada
                    ? 'Login por e-mail e senha ativo'
                    : 'Sem senha definida'
              }
              style={estiloStatus(senhaVinculada === true, false)}
            >
              <KeyRound size={17} />
            </span>
          </div>
        </div>

        <FormGroup>
          <BoldLabel>Foto de perfil</BoldLabel>
          <FotoInput fotoArquivoId={fotoArquivoId} iniciais={iniciais} onChange={trocarFoto} />
        </FormGroup>

        <FormGroup>
          <BoldLabel>E-mail</BoldLabel>
          <div className="input" style={{ color: 'var(--cor-texto-suave)', display: 'flex', alignItems: 'center' }}>
            {perfil?.email ?? '—'}
          </div>
        </FormGroup>

        <Row>
          <Col sm={12} md={6} lg={6} xl={6}>
            <FormGroup>
              <BoldLabel obrigatorio>Nome</BoldLabel>
              <TextInput name="nome" value={nome} onChange={setNome} />
            </FormGroup>
          </Col>
          <Col sm={12} md={6} lg={6} xl={6}>
            <FormGroup>
              <BoldLabel>Data de nascimento</BoldLabel>
              <DateInput name="dataNascimento" value={dataNascimento} onChange={setDataNascimento} />
            </FormGroup>
          </Col>
        </Row>

        {senhaVinculada === false && (
          <div className="u-field">
            <label className="u-field__label">Definir senha de acesso</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PasswordInput
                name="novaSenha"
                value={novaSenha}
                placeholder="Mín. 6 caracteres"
                onChange={setNovaSenha}
                autoComplete="new-password"
              />
              <button
                className="btn btn--secundario"
                onClick={definirSenha}
                disabled={definindoSenha || novaSenha.length < 6}
              >
                {definindoSenha ? 'Definindo…' : 'Definir senha de acesso'}
              </button>
            </div>
          </div>
        )}

        {senhaVinculada && (
          <div className="u-field">
            <label className="u-field__label">Alterar senha</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PasswordInput
                name="alterarSenha"
                value={alterarSenha}
                placeholder="Nova senha (mín. 6)"
                onChange={setAlterarSenha}
                autoComplete="new-password"
              />
              <PasswordInput
                name="confirmarSenha"
                value={confirmarSenha}
                placeholder="Confirmar senha"
                onChange={setConfirmarSenha}
                autoComplete="new-password"
              />
            </div>
            <button
              className="btn btn--secundario"
              onClick={salvarNovaSenha}
              disabled={alterandoSenha || alterarSenha.length < 6 || alterarSenha !== confirmarSenha}
              style={{ marginTop: 8 }}
            >
              {alterandoSenha ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        )}

        <div>
          <button className="btn btn--primario" onClick={salvar} disabled={salvando || !nome}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="card" style={{ width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Minhas disciplinas</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--cor-texto-suave)' }}>Disciplinas em que você participa.</p>
        </div>

        {disciplinas.length === 0 ? (
          <p style={{ color: 'var(--cor-texto-suave)', fontSize: 13, margin: 0 }}>
            Você ainda não participa de nenhuma disciplina.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disciplinas.map((disciplina) => {
              const ehDono = disciplina.papelDoUsuario?.id === PAPEL_DONO;
              return (
                <div
                  key={disciplina.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--cor-borda)',
                    borderRadius: 'var(--raio)',
                    background: 'var(--cor-fundo)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{disciplina.nome}</div>
                    {ehDono && (
                      <div style={{ marginTop: 4 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 999,
                            background: 'color-mix(in srgb, var(--cor-primaria) 14%, transparent)',
                            color: 'var(--cor-primaria)',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Criada por você
                        </span>
                      </div>
                    )}
                    {disciplina.professor && (
                      <div style={{ fontSize: 12, color: 'var(--cor-texto-suave)', marginTop: 4 }}>{disciplina.professor}</div>
                    )}
                  </div>
                  {ehDono ? (
                    disciplina.codigo && (
                      <span
                        title="Código para convidar"
                        style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: 'var(--cor-texto-suave)', whiteSpace: 'nowrap' }}
                      >
                        {disciplina.codigo}
                      </span>
                    )
                  ) : (
                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--cor-erro)', whiteSpace: 'nowrap' }}
                      onClick={() => sairDaDisciplina(disciplina)}
                    >
                      Sair
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
