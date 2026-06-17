import { test, expect } from '@playwright/test';
import { AgendaPage } from '../../pages/AgendaPage';
import { collectPageErrors, relevantErrors } from '../../fixtures/console';

/**
 * Módulo Agenda — 8 bugs críticos mapeados. Esta suíte serve de rede de
 * regressão ANTES da correção dos bugs e da refatoração de complexidade.
 */
test.describe('Vendedor — Agenda', () => {
  test('carrega a agenda sem erro de carregamento', async ({ page }) => {
    const errors = collectPageErrors(page);
    const agenda = new AgendaPage(page);
    await agenda.goto();

    // Não deve ficar preso em erro nem em carregamento dos agendamentos
    await expect(agenda.erroCarregamento).toHaveCount(0);
    await expect(agenda.carregando).toHaveCount(0);

    // Estado terminal renderizado (lista de agendamentos OU vazio — ambos dentro de main)
    await expect(page.getByRole('main').first()).toBeVisible();

    expect(relevantErrors(errors), relevantErrors(errors).join('\n')).toEqual([]);
  });

  test('FAB de adicionar está presente', async ({ page }) => {
    const agenda = new AgendaPage(page);
    await agenda.goto();
    await expect(agenda.fab).toBeVisible();
  });
});
