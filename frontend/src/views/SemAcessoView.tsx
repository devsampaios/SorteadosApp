import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export default function SemAcessoView() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const sair = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ margin: 0 }}>Acesso restrito</h1>
      <p>Esta área é exclusiva para administradores (perfil MASTER).</p>
      <button className="btn" onClick={sair}>
        Sair
      </button>
    </div>
  );
}
