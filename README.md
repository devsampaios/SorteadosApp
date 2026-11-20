# SorteadosApp

Sistema para gerar palpites de loterias (Mega-Sena, Lotofácil e outras) a partir da
base de números já sorteados. Substitui o antigo "Controle Multsoft" (Delphi +
Firebird). As capturas de tela dele e as planilhas de resultados ficam na raiz do
projeto, só como referência local.

**Etapa atual:** autenticação (login + senha, JWT de 7 dias).

## Stack

- **backend/**: Node.js, TypeScript, Express, Prisma e JWT próprio. A senha é guardada
  como hash bcrypt.
- **frontend/**: Vite, React e TypeScript.
- **Banco**: PostgreSQL, banco `sorteados`.

## 1. Banco

```bash
createdb sorteados
```

## 2. Backend (`backend/`)

```bash
cd backend
npm install
cp config.example.json config.json
```

No `config.json`, ajuste o seguinte:
- `database`: a conexão com o Postgres. A senha fica cifrada; gere com
  `npm run cifrar-senha`.
- `jwt.secret` e `crypto.secret`: strings longas e aleatórias.

Crie as tabelas e suba a API:

```bash
npm run setup-tabelas
npm run dev
```

### Criar usuário

Não há tela de cadastro. O usuário é inserido direto no banco, e a senha vai na coluna
`senha` já criptografada:

```bash
npm run criptografar-senha
```

O comando pede a senha e imprime o hash bcrypt. Use esse hash no INSERT:

```sql
INSERT INTO usuario (login, nome, senha) VALUES ('mateus', 'Mateus', '<hash>');
```

Não existem perfis: todo usuário ativo tem acesso a todo o sistema, inclusive ao cadastro
de usuários e à auditoria.

- **Situação:** `1` = ATIVO (padrão), `2` = BLOQUEADO, `3` = EXCLUIDO.

## 3. Frontend (`frontend/`)

```bash
cd frontend
npm install
echo 'VITE_API_URL=http://localhost:3000' > .env.local
npm run dev
```

## Fluxo de autenticação

1. `POST /auth/login` com `{ login, senha }`.
2. O backend busca o usuário pelo login e compara a senha com o hash bcrypt. Login
   inexistente e senha errada recebem a mesma resposta: 401 "Login ou senha inválidos".
   Um usuário que não está ATIVO recebe 403.
3. Em caso de sucesso, devolve um JWT (HS256, 7 dias). O front grava esse token e o
   envia em `Authorization: Bearer <token>`.
4. Em cada requisição, o token é validado e a situação do usuário é conferida no banco.

## Comandos úteis (backend)

- `npm run dev`: sobe a API com hot-reload
- `npm run build` / `npm start`: build de produção
- `npm run setup-tabelas`: sincroniza o schema do Prisma com o banco
- `npm run criptografar-senha`: gera o hash bcrypt de uma senha
- `npm run cifrar-senha`: cifra a senha do banco para o `config.json`
