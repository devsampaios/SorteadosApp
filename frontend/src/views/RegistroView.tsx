import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
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

interface Erros {
  email: string;
  senha: string;
  confirmarSenha: string;
}

function mensagemDeErroFirebase(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? '';
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com este e-mail';
    case 'auth/weak-password':
      return 'Senha muito fraca';
    case 'auth/invalid-email':
      return 'E-mail inválido';
    default:
      return 'Não foi possível criar a conta. Tente novamente';
  }
}

export default function RegistroView() {
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<Erros>({ email: '', senha: '', confirmarSenha: '' });

  const limparErro = (campo: keyof Erros) => setErros((p) => ({ ...p, [campo]: '' }));

  const validar = () => {
    const e: Erros = { email: '', senha: '', confirmarSenha: '' };
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
    } else if (senha.length < 6) {
      e.senha = 'Mínimo de 6 caracteres';
      ok = false;
    }

    if (!confirmarSenha) {
      e.confirmarSenha = 'Confirme a senha';
      ok = false;
    } else if (senha !== confirmarSenha) {
      e.confirmarSenha = 'As senhas não coincidem';
      ok = false;
    }

    setErros(e);
    if (!ok) showError(e.email || e.senha || e.confirmarSenha);
    return ok;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validar()) return;

    setCarregando(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, senha);
      const idToken = await cred.user.getIdToken();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        // Conta criada no Firebase mas recusada pelo backend: encerra a sessão
        // do Firebase pra não ficar autenticado num app que não o aceita.
        await signOut(firebaseAuth).catch(() => {});
        const body = await res.json().catch(() => ({}));
        showError(body.message ?? 'Não foi possível criar a conta');
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
      showSuccess('Conta criada!');
      navigate('/', { replace: true });
    } catch (err) {
      showError(mensagemDeErroFirebase(err));
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
          <span className='login-branding__logo-name'>learning</span>
        </div>
        <h2 className='login-branding__headline'>Crie sua conta</h2>
        <p className='login-branding__sub'>
          Informe e-mail e senha para começar. Os demais dados são preenchidos na próxima etapa.
        </p>
      </div>

      {/* Painel do formulário */}
      <div className='login-form-panel'>
        <div className='login-mobile-logo'>
          <AppLogo size={56} />
        </div>

        <div className='login-card'>
          <div style={{ marginBottom: 24 }}>
            <h1 className='login-card__titulo'>Criar conta</h1>
            <p className='login-card__subtitulo'>Informe e-mail e senha para continuar</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <EmailInput
              name='email'
              label='E-mail'
              value={email}
              onChange={(valor) => {
                setEmail(valor);
                limparErro('email');
              }}
              autoComplete='email'
              error={erros.email}
              disabled={carregando}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PasswordInput
                name='senha'
                label='Senha'
                value={senha}
                placeholder='Mín. 6 caracteres'
                onChange={(valor) => {
                  setSenha(valor);
                  limparErro('senha');
                }}
                error={erros.senha}
                autoComplete='new-password'
                disabled={carregando}
                required
              />
              <PasswordInput
                name='confirmarSenha'
                label='Confirmar senha'
                value={confirmarSenha}
                placeholder='Repita a senha'
                onChange={(valor) => {
                  setConfirmarSenha(valor);
                  limparErro('confirmarSenha');
                }}
                error={erros.confirmarSenha}
                autoComplete='new-password'
                disabled={carregando}
                required
              />
            </div>

            <IndicadorSenha senha={senha} />

            <Button type='submit' label='Criar conta' loading={carregando} style={{ marginTop: 4 }} />
          </form>

          <div className='login-card__divisor'>ou</div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--cor-texto-suave)' }}>
            Já tem uma conta? <Link to='/login'>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function IndicadorSenha({ senha }: { senha: string }) {
  if (!senha) return null;

  const forca = calcularForca(senha);
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Muito forte'];
  const cores = ['var(--cor-erro)', 'var(--cor-erro)', '#f59e0b', 'var(--cor-sucesso)', 'var(--cor-sucesso)'];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < forca ? cores[forca - 1] : 'var(--cor-borda)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: cores[forca - 1] }}>{labels[forca - 1]}</span>
    </div>
  );
}

function calcularForca(senha: string): number {
  let score = 0;
  if (senha.length >= 6) score++;
  if (senha.length >= 10) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;
  return Math.max(1, score) as 1 | 2 | 3 | 4 | 5;
}
