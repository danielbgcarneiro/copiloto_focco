import type { Page } from '@playwright/test';

/**
 * Coleta erros de console e exceções não tratadas durante o teste.
 * Uso:
 *   const errors = collectPageErrors(page);
 *   ... interações ...
 *   expect(errors.filter(isRelevant)).toEqual([]);
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

/**
 * Ruído conhecido que não indica bug do app (extensões, favicon, recursos
 * de terceiros bloqueados por CSP, ResizeObserver benigno).
 */
const NOISE = [
  /favicon/i,
  /ResizeObserver loop/i,
  /Failed to load resource.*404.*\.(png|ico|svg|woff2?)/i,
  /\[vite\]/i,
];

export function relevantErrors(errors: string[]): string[] {
  return errors.filter((e) => !NOISE.some((re) => re.test(e)));
}
