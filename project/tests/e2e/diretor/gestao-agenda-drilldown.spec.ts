import { test, expect } from '@playwright/test';
import { collectPageErrors, relevantErrors } from '../../fixtures/console';

/**
 * Cobre a rota com parâmetro /gestao/agenda/vendedor/:vendedorId
 * via drill-down real: Gestão Agenda → card de vendedor (button).
 */
test.describe('Diretor — Gestão Agenda → detalhe do vendedor', () => {
  test('abre o detalhe de um vendedor a partir da agenda gerencial', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/gestao/agenda', { waitUntil: 'domcontentloaded' });
    // Página pronta: filtro de período renderizado
    await expect(page.getByRole('button', { name: 'Semana atual' })).toBeVisible({ timeout: 15_000 });

    // Card de vendedor = <button class="... text-left ...">; período usa outras classes.
    // Espera a lista assíncrona estabilizar: ou aparece card, ou estado vazio.
    const card = page.locator('main button.text-left').first();
    const semVendedores = page.getByText('Nenhum vendedor encontrado');
    await expect(card.or(semVendedores)).toBeVisible({ timeout: 15_000 });

    if (await semVendedores.isVisible()) {
      test.skip(true, 'Sem vendedores no período — não há dados para drill-down.');
    }

    await card.click();

    await expect(page).toHaveURL(/\/gestao\/agenda\/vendedor\/.+/, { timeout: 15_000 });
    await expect(page.getByRole('main').first()).toBeVisible();

    expect(relevantErrors(errors), relevantErrors(errors).join('\n')).toEqual([]);
  });
});
