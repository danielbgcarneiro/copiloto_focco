import { test, expect } from '@playwright/test';
import { VENDEDOR_ROUTES } from '../../fixtures/routes';
import { visitAndCheck } from '../../fixtures/health';

/**
 * Smoke mobile (iPhone 14 via Chromium) — garante que as páginas do vendedor
 * renderizam e funcionam no viewport mobile, que é o uso real em campo.
 */
test.describe('Vendedor mobile — smoke', () => {
  for (const route of VENDEDOR_ROUTES) {
    test(`mobile carrega ${route.name} (${route.path})`, async ({ page }) => {
      const errors = await visitAndCheck(page, route);
      expect(errors, `Erros mobile em ${route.path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});
