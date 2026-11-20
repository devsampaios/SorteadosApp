# learning

MVP de um sistema de gestão de pagamentos pessoal. Cada usuário se cadastra e só
enxerga/gerencia os próprios lançamentos, formas de pagamento e origens. O escopo
completo do produto está em [`docs/escopo.md`](docs/escopo.md); este MVP cobre apenas
o recorte essencial (sem compra parcelada, lançamentos planejados, gráficos, filtros
avançados, orçamento por origem, anexos ou importação de extrato).

## Stack

- **backend/** — Node.js + TypeScript + Express + Prisma, autenticação via Firebase
  Auth (Admin SDK) + JWT próprio.
- **frontend/** — Vite + React + TypeScript, autenticação via Firebase Auth (client SDK).
- **Banco** — PostgreSQL, rodando localmente.

## Pré-requisitos

- Node.js 20+
- Um Postgres rodando na porta 5432
- Um projeto no [console do Firebase](https://console.firebase.google.com) com os
  provedores **E-mail/senha** e **Google** habilitados em Authentication

## 1. Backend (`backend/`)

```bash
cd backend
npm install
cp config.example.json config.json
```

Edite `backend/config.json` com:
- `database`: credenciais do seu Postgres local.
- `jwt.secret`: qualquer string longa e aleatória (usada para assinar o JWT próprio).
- `firebase.projectId` / `clientEmail` / `privateKey`: dados da **service account**
  do seu projeto Firebase (Console Firebase → Configurações do projeto → Contas de
  serviço → "Gerar nova chave privada"). `clientEmail` e `privateKey` vêm do JSON
  baixado; `privateKey` deve manter os `\n` literais como estão no JSON.

Crie também `backend/.env` (usado apenas pelo Prisma CLI) com a mesma string de
conexão configurada em `config.json`:

```bash
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning"' > .env
```

Sincronize o schema com o banco e suba a API:

```bash
npm run db:push
npm run dev
```

A API sobe em `http://localhost:3000/api`.

## 2. Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edite `frontend/.env.local` com a **config pública** (client-side) do mesmo projeto
Firebase — Console Firebase → Configurações do projeto → Seus apps → SDK setup:

```
VITE_API_URL=/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

O frontend sobe (por padrão) em `http://localhost:8080` ou na próxima porta livre
que o Vite escolher.

`VITE_API_URL=/api` é um caminho relativo de propósito: o Vite (`vite.config.ts`)
faz proxy de `/api` para `http://localhost:3000`, então o app funciona tanto em
`localhost` quanto acessado por outro dispositivo na mesma rede (ex: celular testando
via `http://<ip-da-máquina>:8080`) sem precisar trocar a URL da API nem lidar com CORS.

## Fluxo de autenticação

1. Cliente autentica no Firebase (e-mail/senha ou Google) via SDK do navegador.
2. Cliente troca o ID token do Firebase por uma sessão da API: `POST /api/auth/session`.
3. A API valida o ID token com o Firebase Admin SDK, cria/atualiza o `Usuario` pelo
   `firebase_uid` e retorna um JWT próprio (HS256, 7 dias), que também é gravado no
   próprio registro do usuário.
4. Requisições seguintes usam esse JWT (`Authorization: Bearer <token>`); todo dado
   é sempre filtrado pelo `usuario_id` do token — nunca por ID direto vindo do cliente.

## Comandos úteis (backend)

- `npm run dev` — sobe a API com hot-reload
- `npm run build` / `npm start` — build de produção
- `npm run db:push` — sincroniza o schema do Prisma com o banco (sem tabela de migrations)
- `npm run db:studio` — abre o Prisma Studio

## Comandos úteis (frontend)

- `npm run dev` — sobe o Vite com hot-reload
- `npm run build` — typecheck + build de produção
- `npm run lint` — ESLint
# SorteadosApp
