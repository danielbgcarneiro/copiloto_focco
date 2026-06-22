import { test, expect } from '@playwright/test';
import { collectPageErrors, relevantErrors } from '../../fixtures/console';

/**
 * Drill-down de ROTA DE MACRORREGIÃO (grão bairro).
 * Diferente da rota de cidade, a macrorregião vive numa única capital e deve
 * PULAR a página /cidades, indo direto aos clientes da rota:
 *   /rotas → /rotas/:rota/clientes → /rotas/:rota/clientes/:id/detalhes
 *
 * Usa a conta de QA de Fortaleza (cod_vendedor 16), que tem macrorregiões.
 * Isola a macro pela busca para não depender da ordenação por oportunidade.
 */
const MACRO = 'Eixo Grande Bom Jardim';

test.describe('Vendedor — drill-down de macrorregião (pula /cidades)', () => {
  test('rota de macrorregião vai direto para clientes, sem passar por cidades', async ({ page }) => {
    const errors = collectPageErrors(page);

    // 1. Rotas — filtra pela macro via busca
    await page.goto('/rotas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('banner').getByText('Rotas')).toBeVisible();

    // Espera os cards renderizarem (query assíncrona multi-passo)
    const algumCard = page.getByRole('button').filter({ hasText: /óticas/ }).first();
    await algumCard.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {});

    await page.getByPlaceholder('Buscar rotas...').fill(MACRO);

    const macroCard = page.getByRole('button').filter({ hasText: MACRO });
    await macroCard.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    if (!(await macroCard.isVisible())) {
      test.skip(true, `Macro "${MACRO}" não disponível para este vendedor — dados podem ter mudado.`);
    }
    await macroCard.click();

    // 2. PULA /cidades → cai direto em /rotas/:rota/clientes
    await expect(page).toHaveURL(/\/rotas\/[^/]+\/clientes$/, { timeout: 15_000 });
    expect(page.url()).not.toContain('/cidades');
    await expect(page.getByRole('banner').getByText('Clientes')).toBeVisible();
    await expect(page.getByPlaceholder('Buscar óticas / bairro...')).toBeVisible();

    // 3. Clientes da macro carregam → drill para detalhes (path sem /cidades)
    const clienteCard = page.locator('main div.cursor-pointer').first();
    await expect(clienteCard).toBeVisible({ timeout: 20_000 });
    await clienteCard.click();

    await expect(page).toHaveURL(/\/rotas\/[^/]+\/clientes\/[^/]+\/detalhes$/, { timeout: 15_000 });
    expect(page.url()).not.toContain('/cidades');
    await expect(page.getByRole('banner').getByText('Detalhes do Cliente')).toBeVisible({ timeout: 20_000 });

    expect(
      relevantErrors(errors),
      `Erros durante o drill-down da macrorregião:\n${relevantErrors(errors).join('\n')}`,
    ).toEqual([]);
  });

  test('entrada por URL direta de /cidades numa macro redireciona para clientes', async ({ page }) => {
    // Fallback defensivo: bookmark antigo / URL colada da página de cidades
    await page.goto(`/rotas/${encodeURIComponent(MACRO)}/cidades`, { waitUntil: 'domcontentloaded' });

    // Deve redirecionar (replace) para a lista de clientes da rota
    await expect(page).toHaveURL(/\/rotas\/[^/]+\/clientes$/, { timeout: 20_000 });
    expect(page.url()).not.toContain('/cidades');
    await expect(page.getByRole('banner').getByText('Clientes')).toBeVisible();
  });
});
