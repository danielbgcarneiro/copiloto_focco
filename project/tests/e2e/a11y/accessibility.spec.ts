import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Auditoria de acessibilidade (axe-core) nas páginas principais.
 * Usa sessão de vendedor. Foca em violações sérias/críticas para reduzir ruído.
 */
const PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Rotas', path: '/rotas' },
  { name: 'Inadimplentes', path: '/inadimplentes' },
  { name: 'Meus Pedidos', path: '/meus-pedidos' },
  { name: 'Agenda', path: '/agenda' },
];

for (const p of PAGES) {
  test(`a11y: ${p.name} sem violações sérias/críticas`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main').first()).toBeVisible();
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    expect(
      serious,
      serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n'),
    ).toEqual([]);
  });
}
