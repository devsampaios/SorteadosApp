import { useState, type FormEvent } from 'react';
import { TextInput, PasswordInput, Button } from './utils';

interface LoginFormProps {
  carregando?: boolean;
  onSubmit: (login: string, senha: string) => void;
}

/** Formulário de login + senha. Só valida campos vazios; quem autentica é o backend. */
export default function LoginForm({ carregando = false, onSubmit }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({ login: '', senha: '' });

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const novosErros = {
      login: login.trim() ? '' : 'Informe o login',
      senha: senha ? '' : 'Informe a senha',
    };
    setErros(novosErros);
    if (novosErros.login || novosErros.senha) return;
    onSubmit(login.trim(), senha);
  };

  return (
    <form onSubmit={enviar} noValidate>
      <TextInput
        name='login'
        label='Login'
        value={login}
        onChange={(valor) => {
          setLogin(valor);
          setErros((e) => ({ ...e, login: '' }));
        }}
        autoComplete='username'
        error={erros.login}
        disabled={carregando}
        required
      />
      <PasswordInput
        name='senha'
        label='Senha'
        value={senha}
        onChange={(valor) => {
          setSenha(valor);
          setErros((e) => ({ ...e, senha: '' }));
        }}
        autoComplete='current-password'
        error={erros.senha}
        disabled={carregando}
        required
      />
      <Button type='submit' label='Entrar' loading={carregando} style={{ marginTop: 8 }} />
    </form>
  );
}
