# Testes E2E — Playwright

Suíte de testes end-to-end do Copiloto Focco Brasil. Cobre **todas as rotas**
de `src/App.tsx`, nos três papéis (`vendedor`, `gestor`, `diretor`), incluindo
as rotas com parâmetros (via jornadas de drill-down que descobrem IDs reais).

## Pré-requisitos

1. **Browser + libs de SO:** `npm run test:install` (baixa o Chromium).
   Em WSL/Ubuntu limpo faltam libs de sistema (`libnspr4`, `libnss3`, ...).
   Se você **não tem a senha do sudo**, instale como root via interop do Windows
   (root no WSL não pede senha):

   ```bash
   wsl.exe -u root -- bash -lc \
     "/caminho/para/node node_modules/playwright/cli.js install-deps chromium"
   ```

   > Se o apt reclamar de `dpkg interrupted`, rode antes:
   > `wsl.exe -u root -- bash -lc "dpkg --configure -a"`
2. **Credenciais de teste** — adicione ao `.env` (ver `.env.example`):

   ```
   PLAYWRIGHT_VENDEDOR_EMAIL / PLAYWRIGHT_VENDEDOR_PASS
   PLAYWRIGHT_DIRETOR_EMAIL  / PLAYWRIGHT_DIRETOR_PASS
   ```

   > Use **contas de QA dedicadas**, nunca contas reais de produção. Cada conta
   > precisa de um `profiles.cargo` correspondente ao papel.
   >
   > **Papel `gestor` não é coberto** — não há conta de gestor disponível.
   > Para reativar: recrie `tests/setup/gestor.setup.ts`, o projeto `gestor`
   > em `playwright.config.ts` e um spec em `tests/e2e/gestor/`.

O Playwright sobe o dev server sozinho (`npm run dev`, porta 3000) via `webServer`.

## Como rodar

| Comando | O que faz |
|---------|-----------|
| `npm test` | Roda a suíte inteira |
| `npm run test:ui` | Modo interativo (UI mode) |
| `npm run test:headed` | Com browser visível |
| `npm run test:auth` | Só fluxos de login (não exige credenciais) |
| `npm run test:vendedor` | Suíte do vendedor |
| `npm run test:gestor` | Suíte do gestor |
| `npm run test:diretor` | Suíte do diretor (módulo Gestão) |
| `npm run test:a11y` | Acessibilidade (axe-core) |
| `npm run test:mobile` | Smoke mobile (iPhone 14) |
| `npm run test:report` | Abre o último relatório HTML |

## Estrutura

```
tests/
├── fixtures/
│   ├── auth.ts          # paths de storageState + usuários por papel
│   ├── console.ts       # coletor de erros de console/exceções + filtro de ruído
│   ├── health.ts        # visitAndCheck() — saúde da página (load + sem erros)
│   └── routes.ts        # manifesto de TODAS as rotas estáticas por papel
├── setup/
│   ├── login.ts         # helper de login compartilhado
│   ├── vendedor.setup.ts
│   ├── gestor.setup.ts
│   └── diretor.setup.ts # autenticam e salvam sessão em playwright/.auth/
├── pages/               # Page Objects (BasePage, LoginPage, AgendaPage, ClientesPage)
└── e2e/
    ├── auth/            # login público (sem sessão)
    ├── vendedor/        # rotas estáticas + drill-down + agenda
    ├── gestor/          # rotas acessíveis + restrições de acesso
    ├── diretor/         # módulo Gestão completo + drill-down agenda→vendedor
    ├── a11y/            # auditoria axe-core
    └── mobile/          # smoke mobile
```

## Como a autenticação funciona

Cada `*.setup.ts` faz login real via Supabase uma vez e salva o `storageState`
em `playwright/.auth/<papel>.json` (git-ignored). As suítes autenticadas
reutilizam essa sessão via `storageState`, sem relogar a cada teste.

## Filosofia de cobertura

- **Rotas estáticas:** iteradas a partir do manifesto `routes.ts` — cada uma é
  visitada e verificada (carregou + título correto + **zero erros de console**).
- **Rotas com parâmetros:** cobertas por jornadas reais de drill-down
  (`/rotas → /cidades → /clientes → /detalhes` e `/gestao/agenda → vendedor`),
  descobrindo IDs reais clicando nos cards — sem hardcode de IDs.
- **Erros de console:** tratados como falha (com filtro de ruído conhecido em
  `console.ts`). É a rede de regressão para corrigir bugs e refatorar
  complexidade ciclomática com segurança.
