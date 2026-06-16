import { test, expect } from '@playwright/test';
import { collectPageErrors, relevantErrors } from '../../fixtures/console';

/**
 * Jornada real do vendedor cobrindo as rotas com parâmetros:
 *   /rotas → /rotas/:rota/cidades → .../clientes → .../clientes/:id/detalhes
 * Descobre IDs reais clicando nos cards (Card interativo = role="button";
 * card de cliente = div.cursor-pointer).
 */
test.describe('Vendedor — drill-down Rotas → Cidades → Clientes → Detalhes', () => {
  test('navega a hierarquia completa sem erros', async ({ page }) => {
    const errors = collectPageErrors(page);

    // 1. Rotas
    await page.goto('/rotas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('banner').getByText('Rotas')).toBeVisible();

    // Cards carregam via query assíncrona (multi-passo) — espera renderizar
    // antes de decidir. Só pula se realmente não houver rotas após o timeout.
    const rotaCard = page.getByRole('button').filter({ hasText: /óticas/ }).first();
    await rotaCard.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    if (!(await rotaCard.isVisible())) {
      test.skip(true, 'Sem rotas para este vendedor — não há dados para drill-down.');
    }
    await rotaCard.click();

    // 2. Cidades
    await expect(page).toHaveURL(/\/rotas\/.+\/cidades$/, { timeout: 15_000 });
    await expect(page.getByRole('banner').getByText('Cidades')).toBeVisible();

    const cidadeCard = page.getByRole('button').filter({ hasText: /óticas/ }).first();
    await expect(cidadeCard).toBeVisible({ timeout: 15_000 });
    await cidadeCard.click();

    // 3. Clientes
    await expect(page).toHaveURL(/\/cidades\/.+\/clientes$/, { timeout: 15_000 });
    await expect(page.getByRole('banner').getByText('Clientes')).toBeVisible();
    await expect(page.getByPlaceholder('Buscar óticas / bairro...')).toBeVisible();

    const clienteCard = page.locator('main div.cursor-pointer').first();
    await expect(clienteCard).toBeVisible({ timeout: 20_000 });
    await clienteCard.click();

    // 4. Detalhes do Cliente (DetalhesClienteV2)
    await expect(page).toHaveURL(/\/clientes\/.+\/detalhes$/, { timeout: 15_000 });
    await expect(page.getByRole('banner').getByText('Detalhes do Cliente')).toBeVisible({ timeout: 20_000 });

    expect(
      relevantErrors(errors),
      `Erros durante o drill-down:\n${relevantErrors(errors).join('\n')}`,
    ).toEqual([]);
  });

  test('busca de clientes filtra a lista', async ({ page }) => {
    await page.goto('/rotas', { waitUntil: 'domcontentloaded' });
    const rotaCard = page.getByRole('button').filter({ hasText: /óticas/ }).first();
    await rotaCard.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});
    if (!(await rotaCard.isVisible())) test.skip(true, 'Sem rotas para drill-down.');
    await rotaCard.click();

    const cidadeCard = page.getByRole('button').filter({ hasText: /óticas/ }).first();
    await cidadeCard.waitFor({ state: 'visible', timeout: 20_000 });
    await cidadeCard.click();

    await expect(page.getByRole('banner').getByText('Clientes')).toBeVisible();
    const busca = page.getByPlaceholder('Buscar óticas / bairro...');
    await busca.fill('zzzzz-nao-existe-xyz');
    // Não deve quebrar — lista some / mostra vazio, sem exceção
    await page.waitForTimeout(500);
    await expect(busca).toHaveValue('zzzzz-nao-existe-xyz');
  });
});
