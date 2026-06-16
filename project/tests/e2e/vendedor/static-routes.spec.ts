import { test, expect } from '@playwright/test';
import { VENDEDOR_ROUTES } from '../../fixtures/routes';
import { visitAndCheck } from '../../fixtures/health';

test.describe('Vendedor — rotas estáticas', () => {
  test('login de vendedor cai em /dashboard', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  for (const route of VENDEDOR_ROUTES) {
    test(`carrega ${route.name} (${route.path}) sem erros`, async ({ page }) => {
      const errors = await visitAndCheck(page, route);
      expect(errors, `Erros de console em ${route.path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});
