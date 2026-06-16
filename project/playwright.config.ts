import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Playwright roda em Node.js — carrega o .env do projeto (Vite carrega sozinho,
// mas o setup de auth precisa das PLAYWRIGHT_*_EMAIL/PASS aqui no Node).
loadEnv({ path: '.env' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 2 workers locais: Vite dev + auth Supabase concorrente com muitos workers gera timeout
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  reporter: [['html', { open: 'never' }], ['line']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // SSL corporativo pode interceptar conexões — não falhar por cert no browser
    ignoreHTTPSErrors: true,
  },

  projects: [
    // ── Auth Setup (roda antes das suites autenticadas) ──────────────────────
    { name: 'setup:vendedor', testMatch: '**/setup/vendedor.setup.ts' },
    { name: 'setup:diretor', testMatch: '**/setup/diretor.setup.ts' },

    // ── Testes de Auth (login form, credenciais inválidas) — sem sessão ──────
    {
      name: 'auth-flows',
      testMatch: '**/e2e/auth/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Vendedor logado (dashboard, rotas, clientes, agenda) ────────────────
    {
      name: 'vendedor',
      testMatch: '**/e2e/vendedor/**/*.spec.ts',
      dependencies: ['setup:vendedor'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/vendedor.json',
      },
    },

    // ── Diretor logado (módulo Gestão) ──────────────────────────────────────
    {
      name: 'diretor',
      testMatch: '**/e2e/diretor/**/*.spec.ts',
      dependencies: ['setup:diretor'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/diretor.json',
      },
    },

    // ── Acessibilidade (axe) — usa sessão de vendedor ───────────────────────
    {
      name: 'a11y',
      testMatch: '**/e2e/a11y/**/*.spec.ts',
      dependencies: ['setup:vendedor'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/vendedor.json',
      },
    },

    // ── Vendedor mobile (iPhone 14 via Chromium) — smoke ────────────────────
    {
      name: 'vendedor:mobile',
      testMatch: '**/e2e/mobile/**/*.spec.ts',
      dependencies: ['setup:vendedor'],
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        storageState: 'playwright/.auth/vendedor.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
