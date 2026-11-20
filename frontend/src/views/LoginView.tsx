import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type AuthCredential,
} from 'firebase/auth';
import { firebaseAuth } from '../firebase';
import { useAuth } from '../context/authContext';
import { AppLogo } from '../components/AppLogo';
import { useToast } from '../toast/ToastContext';
import { EmailInput, PasswordInput, Button } from '../components/utils';
import type { TipoPerfil } from '../types/dominio';

interface SessaoResponse {
  token: string;
  usuarioId: string;
  email: string;
  nome: string | null;
  perfil: TipoPerfil;
}

function mensagemDeErroFirebase(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? '';
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return 'Não foi possível entrar. Tente novamente';
  }
}

/** Credencial do Google pendente de vínculo a uma conta e-mail/senha já existente. */
interface VinculoPendente {
  cred: AuthCredential;
  email: string;
}

export default function LoginView() {
  const { login } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erros, setErros] = useState({ email: '', senha: '' });
  const [vinculoPendente, setVinculoPendente] = useState<VinculoPendente | null>(null);

  const validar = () => {
    const e = { email: '', senha: '' };
    let ok = true;

    if (!email) {
      e.email = 'Informe o e-mail';
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'E-mail inválido';
      ok = false;
    }

    if (!senha) {
      e.senha = 'Informe a senha';
      ok = false;
    }

    setErros(e);
    if (!ok) showError(e.email || e.senha);
    return ok;
  };

  const trocarSessao = async (idToken: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      // O Firebase autenticou, mas o backend recusou (bloqueado/excluído).
      // Sem esse signOut a sessão do Firebase fica aberta e o usuário volta a
      // entrar sozinho no próximo carregamento — vale principalmente pro
      // login com Google, que não repassa por formulário.
      await signOut(firebaseAuth).catch(() => {});
      const body = await res.json().catch(() => ({}));
      showError(body.message ?? 'Não foi possível entrar');
      return;
    }

    const dados: SessaoResponse = await res.json();
    login({
      usuarioId: dados.usuarioId,
      email: dados.email,
      nome: dados.nome,
      token: dados.token,
      perfil: dados.perfil,
    });
    navigate('/', { replace: true });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Se há um vínculo pendente, a senha digitada serve pra autenticar na conta
    // existente e anexar o Google a ela (mesmo firebaseUid).
    if (vinculoPendente) return vincularGoogleEEntrar();
    if (!validar()) return;

    setCarregando(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, senha);
      const idToken = await cred.user.getIdToken();
      await trocarSessao(idToken);
    } catch (err) {
      const mensagem = mensagemDeErroFirebase(err);
      if (mensagem) showError(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogleLogin = async () => {
    setCarregandoGoogle(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      await trocarSessao(idToken);
    } catch (err) {
      // Já existe uma conta e-mail/senha com este e-mail (Firebase configurado
      // como "uma conta por e-mail"). Guardamos a credencial do Google e pedimos
      // a senha pra vincular os dois provedores ao mesmo firebaseUid.
      const codigo = (err as { code?: string })?.code ?? '';
      if (codigo === 'auth/account-exists-with-different-credential') {
        const pendente = GoogleAuthProvider.credentialFromError(err as never);
        const emailConflito = ((err as { customData?: { email?: string } })?.customData?.email) ?? '';
        if (pendente && emailConflito) {
          setEmail(emailConflito);
          setSenha('');
          setVinculoPendente({ cred: pendente, email: emailConflito });
          showError('Já existe uma conta com e-mail e senha. Digite a senha para vincular o Google.');
          return;
        }
      }
      const mensagem = mensagemDeErroFirebase(err);
      if (mensagem) showError(mensagem);
    } finally {
      setCarregandoGoogle(false);
    }
  };

  const vincularGoogleEEntrar = async () => {
    if (!vinculoPendente) return;
    if (!senha) {
      setErros((p) => ({ ...p, senha: 'Informe a senha' }));
      showError('Informe a senha da conta existente');
      return;
    }
    setCarregando(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, vinculoPendente.email, senha);
      await linkWithCredential(cred.user, vinculoPendente.cred);
      const idToken = await cred.user.getIdToken();
      setVinculoPendente(null);
      await trocarSessao(idToken);
    } catch (err) {
      const codigo = (err as { code?: string })?.code ?? '';
      if (codigo === 'auth/provider-already-linked' || codigo === 'auth/credential-already-in-use') {
        // Já vinculado numa tentativa anterior: basta seguir com a sessão.
        setVinculoPendente(null);
        const atual = firebaseAuth.currentUser;
        if (atual) {
          const idToken = await atual.getIdToken();
          await trocarSessao(idToken);
          return;
        }
      }
      const mensagem = mensagemDeErroFirebase(err);
      if (mensagem) showError(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className='login-page'>
      {/* Painel de branding — desktop only */}
      <div className='login-branding'>
        <div className='login-branding__logo'>
          <AppLogo size={44} />
          {/* Troque o texto pelo nome da sua aplicação */}
          <span className='login-branding__logo-name'>learning</span>
        </div>
        <h2 className='login-branding__headline'>Bem-vindo de volta</h2>
        <p className='login-branding__sub'>Acesse sua conta para continuar usando a plataforma.</p>
      </div>

      {/* Painel do formulário */}
      <div className='login-form-panel'>
        {/* Logo mobile */}
        <div className='login-mobile-logo'>
          <AppLogo size={56} />
        </div>

        <div className='login-card'>
          <div style={{ marginBottom: 24 }}>
            <h1 className='login-card__titulo'>Entrar</h1>
            <p className='login-card__subtitulo'>Entre com suas credenciais para continuar</p>
          </div>

          <Button
            type='button'
            variant='secondary'
            label='Entrar com Google'
            loading={carregandoGoogle}
            disabled={carregando || vinculoPendente !== null}
            onClick={handleGoogleLogin}
            style={{ marginBottom: 16 }}
          />

          {vinculoPendente && (
            <div
              style={{
                background: 'var(--cor-fundo-suave, rgba(0,0,0,0.04))',
                border: '1px solid var(--cor-borda)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 13,
                color: 'var(--cor-texto-suave)',
              }}
            >
              Este e-mail já tem conta com senha. Digite a senha para vincular o Google ao mesmo acesso.
            </div>
          )}

          <div className='login-card__divisor'>ou entre com e-mail</div>

          <form onSubmit={handleSubmit} noValidate>
            <EmailInput
              name='email'
              label='E-mail'
              value={email}
              onChange={(valor) => {
                setEmail(valor);
                setErros((p) => ({ ...p, email: '' }));
              }}
              autoComplete='email'
              error={erros.email}
              disabled={carregando || vinculoPendente !== null}
              required
            />

            <div className='u-field'>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor='senha' className='u-field__label'>
                  Senha
                </label>
                <a href='#' style={{ fontSize: 12 }}>
                  Esqueceu a senha?
                </a>
              </div>
              <PasswordInput
                name='senha'
                value={senha}
                onChange={(valor) => {
                  setSenha(valor);
                  setErros((p) => ({ ...p, senha: '' }));
                }}
                error={erros.senha}
                disabled={carregando}
                autoComplete='current-password'
                required
              />
            </div>

            <Button
              type='submit'
              label={vinculoPendente ? 'Vincular Google e entrar' : 'Entrar'}
              loading={carregando}
              disabled={carregandoGoogle}
              style={{ marginTop: 8 }}
            />
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--cor-texto-suave)', marginTop: 16 }}>
            Não tem uma conta? <Link to='/registro'>Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
