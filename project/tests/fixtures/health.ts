import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { collectPageErrors, relevantErrors } from './console';
import type { RouteSpec } from './routes';

/**
 * Visita uma rota e verifica "saúde" básica da página:
 *   - app autenticado carregado (botão "Sair" do AppTopBar)
 *   - <main> visível
 *   - título no header (se a rota tiver) e/ou texto-âncora de conteúdo
 *   - ausência de erros de console/exceções relevantes
 *
 * Retorna os erros relevantes capturados (para asserção no spec).
 */
export async function visitAndCheck(page: Page, route: RouteSpec): Promise<string[]> {
  const errors = collectPageErrors(page);

  await page.goto(route.path, { waitUntil: 'domcontentloaded' });

  // Logado em qualquer papel
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: 20_000 });
  // NOTA: algumas páginas renderizam um <main> próprio além do <main> do AppShell
  // (landmark duplicado — achado de a11y reportado pela suíte axe). Por isso .first().
  await expect(page.getByRole('main').first()).toBeVisible();

  if (route.title) {
    await expect(page.getByRole('banner').getByText(route.title)).toBeVisible();
  }
  if (route.anchor) {
    await expect(page.getByText(route.anchor).first()).toBeVisible({ timeout: 15_000 });
  }

  // Pequena folga para queries assíncronas dispararem possíveis erros
  await page.waitForTimeout(800);

  return relevantErrors(errors);
}
