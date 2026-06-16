/**
 * Auth Fixtures — reutiliza sessões autenticadas por papel (cargo).
 * Cada papel usa o storageState salvo pelo setup correspondente.
 *
 * Papéis do Copiloto (profiles.cargo): vendedor | diretor
 * (não há conta de gestor — papel não coberto pela suíte)
 *
 * Env vars necessárias (em .env ou CI secrets):
 *   PLAYWRIGHT_VENDEDOR_EMAIL / PLAYWRIGHT_VENDEDOR_PASS
 *   PLAYWRIGHT_DIRETOR_EMAIL  / PLAYWRIGHT_DIRETOR_PASS
 */

export const AUTH_PATHS = {
  vendedor: 'playwright/.auth/vendedor.json',
  diretor: 'playwright/.auth/diretor.json',
} as const;

export const TEST_USERS = {
  vendedor: {
    email: process.env.PLAYWRIGHT_VENDEDOR_EMAIL ?? '',
    password: process.env.PLAYWRIGHT_VENDEDOR_PASS ?? '',
  },
  diretor: {
    email: process.env.PLAYWRIGHT_DIRETOR_EMAIL ?? '',
    password: process.env.PLAYWRIGHT_DIRETOR_PASS ?? '',
  },
} as const;

export type Role = keyof typeof TEST_USERS;
