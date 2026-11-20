import { useEffect, useState } from 'react';
import api from '../service/Api';
import { useAuth } from '../context/authContext';
import { useToast } from '../toast/ToastContext';
import { TextInput, Button, Card } from './utils';
import type { PerfilUsuario } from '../types/dominio';

/** Dados do usuário logado: login (somente leitura) e nome (editável). */
export default function PerfilForm() {
  const { atualizarUsuario } = useAuth();
  const { showSuccess } = useToast();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get<PerfilUsuario>('/perfil').then((p) => {
      setPerfil(p);
      setNome(p.nome ?? '');
    }).catch(() => {});
  }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      const p = await api.put<PerfilUsuario>('/perfil', { nome: nome.trim() });
      setPerfil(p);
      atualizarUsuario({ nome: p.nome });
      showSuccess('Perfil atualizado.');
    } catch {
      // tratado pela Api
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card hover={false} style={{ width: 'min(560px, 100%)' }}>
      <h2 style={{ margin: '0 0 16px' }}>Perfil</h2>
      <TextInput name='login' label='Login' value={perfil?.login ?? ''} onChange={() => {}} disabled />
      <TextInput name='nome' label='Nome' value={nome} onChange={setNome} />
      <Button label='Salvar' loading={salvando} disabled={!perfil} onClick={salvar} />
    </Card>
  );
}
