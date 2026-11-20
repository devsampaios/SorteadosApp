# Marca — Sorteados

Identidade aplicada no `frontend/`. O canvas com os símbolos, a paleta e as
aplicações está em: https://claude.ai/artifact/NbGeuJozkKXhTHGXH1f5GQ

## Símbolo

Uma esfera (a bolinha do sorteio) com a inicial dentro. Duas versões:

- **Esfera** (contorno) — marca, usada no login e no topo. `AppLogo` padrão.
- **Bloco** (preenchido) — ícone de app e favicon. Abaixo de 32 px o contorno
  some, por isso o ícone é sempre o bloco: `<AppLogo variante="bloco" />`.

Arquivos: `src/assets/logo-sorteados.svg`, `public/favicon.svg`.
O componente `src/components/AppLogo.tsx` desenha o SVG inline e lê a cor dos
tokens — não existe mais PNG de logo.

## Cores (`src/styles/global.css`)

Tema escuro. Toda a cor vem das variáveis; não há hex solto nos componentes.

| Token                   | Hex       | Uso                                   |
| ----------------------- | --------- | ------------------------------------- |
| `--cor-fundo`           | `#0b0e13` | Fundo da aplicação                    |
| `--cor-fundo-card`      | `#11151c` | Cartões, sidebar, header              |
| `--cor-fundo-input`     | `#1a1f28` | Campos, linha alternada               |
| `--cor-borda`           | `#2a313d` | Bordas e divisores                    |
| `--cor-texto-suave`     | `#8b96a6` | Texto secundário (6,1:1)              |
| `--cor-texto`           | `#e6eaf0` | Texto principal (15:1)                |
| `--cor-primaria`        | `#f0b429` | Marca, botão primário, dezena do palpite |
| `--cor-primaria-hover`  | `#ffd166` | Hover e foco                          |
| `--cor-sobre-primaria`  | `#0b0e13` | Texto sobre qualquer cor sólida       |
| `--cor-sucesso`         | `#19b6a8` | Dezena acertada na conferência        |
| `--cor-erro`            | `#e5484d` | Erro de validação, 401/403            |

Regras: um acento só (âmbar) para marca e ação principal; verde-água apenas
para acerto, vermelho apenas para erro. Acerto e erro também se distinguem por
forma (preenchido vs. contorno), não só por cor.

## Tipografia

| Token           | Família        | Uso                        |
| --------------- | -------------- | -------------------------- |
| `--fonte-titulo`| Space Grotesk  | Marca e títulos (500/600/700) |
| `--fonte-corpo` | Inter          | Interface e corpo (400/500/600) |
| `--fonte-mono`  | JetBrains Mono | Dezenas e tabelas (500)    |

Carregadas por `<link>` do Google Fonts no `index.html`.
Escala: 12 · 14 · 16 · 20 · 26 · 34 · 44 px. Entrelinha 1,1 em título e 1,6 em
corpo. Títulos com `letter-spacing: -0.02em`.

## Não fazer

- Logo sobre foto ou gradiente — só sobre as cores da base.
- Verde/roxo/azul das loterias da Caixa: o sistema é pessoal e não é oficial.
- Esticar, rotacionar ou aplicar sombra/brilho no símbolo.
- Escrever "SORTEADOS" em caixa alta na marca — o wordmark é caixa baixa.
