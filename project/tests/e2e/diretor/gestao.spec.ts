import { test, expect } from '@playwright/test';
import { DIRETOR_ROUTES } from '../../fixtures/routes';
import { visitAndCheck } from '../../fixtures/health';

test.describe('Diretor — módulo Gestão', () => {
  test('login de diretor cai em /gestao', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/gestao/, { timeout: 15_000 });
  });

  for (const route of DIRETOR_ROUTES) {
    test(`carrega ${route.name} (${route.path}) sem erros`, async ({ page }) => {
      const errors = await visitAndCheck(page, route);
      expect(errors, `Erros de console em ${route.path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('navegação interna do Gestão funciona (NavLinks)', async ({ page }) => {
    await page.goto('/gestao', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('banner').getByText('Gestão')).toBeVisible();

    for (const label of ['Dashboard Rotas', 'Top Clientes', 'Acumulado do Ano', 'Visão Geral']) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page.getByRole('main').first()).toBeVisible();
    }
  });
});
