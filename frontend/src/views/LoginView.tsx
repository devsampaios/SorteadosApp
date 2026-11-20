import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../service/Api';
import { useAuth } from '../context/authContext';
import { AppLogo } from '../components/AppLogo';
import LoginForm from '../components/LoginForm';

interface SessaoResponse {
  token: string;
  usuarioId: string;
  login: string;
  nome: string | null;
}

export default function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);

  // Erros (ex: "Login ou senha inválidos") já são exibidos pela Api.
  const entrar = async (usuario: string, senha: string) => {
    setCarregando(true);
    try {
      const sessao = await api.post<SessaoResponse>('/auth/login', { login: usuario, senha });
      login(sessao);
      navigate('/', { replace: true });
    } catch {
      // tratado pela Api
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className='login-page'>
      <div className='login-branding'>
        <div className='login-branding__logo'>
          <AppLogo size={44} />
          <span className='login-branding__logo-name'>Sorteados</span>
        </div>
        <h2 className='login-branding__headline'>Bem-vindo de volta</h2>
        <p className='login-branding__sub'>Acesse sua conta para gerar seus palpites.</p>
      </div>

      <div className='login-form-panel'>
        <div className='login-mobile-logo'>
          <AppLogo size={56} />
        </div>

        <div className='login-card'>
          <div style={{ marginBottom: 24 }}>
            <h1 className='login-card__titulo'>Entrar</h1>
            <p className='login-card__subtitulo'>Informe seu login e senha</p>
          </div>
          <LoginForm carregando={carregando} onSubmit={entrar} />
        </div>
      </div>
    </div>
  );
}
