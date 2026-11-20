import { useAuth } from '../context/authContext';
import { Card } from './utils';

/** Cartão de boas-vindas da tela inicial. */
export default function BoasVindas() {
  const { usuario } = useAuth();

  return (
    <Card hover={false} style={{ width: 'min(720px, 100%)' }}>
      <h2 style={{ margin: 0 }}>Olá, {usuario?.nome || usuario?.login}!</h2>
      <p style={{ margin: '8px 0 0', color: 'var(--cor-texto-suave)' }}>
        Em breve: resultados, estatísticas e gerador de palpites da Mega-Sena e da Lotofácil.
      </p>
    </Card>
  );
}
