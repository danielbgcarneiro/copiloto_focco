import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Base para todas as páginas autenticadas.
 * Âncoras universais do AppShell (src/components/molecules/AppTopBar.tsx):
 *   - <header> com botão "Sair" (sempre presente quando logado)
 *   - título da página no centro do header (definido via useSetPage)
 *   - botão "Menu" (apenas vendedor) e "Voltar" (quando há onBack)
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  get header(): Locator {
    return this.page.getByRole('banner'); // <header>
  }

  get logoutBtn(): Locator {
    return this.page.getByRole('button', { name: 'Sair' });
  }

  get menuBtn(): Locator {
    return this.page.getByRole('button', { name: 'Menu' });
  }

  get backBtn(): Locator {
    return this.page.getByRole('button', { name: 'Voltar' });
  }

  get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Título exibido no centro do AppTopBar (definido por useSetPage). */
  pageTitle(text: string | RegExp): Locator {
    return this.header.getByText(text);
  }

  /** Confirma que o app autenticado carregou (header + botão Sair). */
  async expectLoaded(): Promise<void> {
    await expect(this.logoutBtn).toBeVisible({ timeout: 20_000 });
  }

  /** Abre o menu lateral (somente vendedor possui itens de navegação). */
  async openMenu(): Promise<void> {
    await this.menuBtn.click();
  }

  /** Navega pelo drawer (vendedor) clicando no item pelo rótulo. */
  async navigateViaMenu(label: string): Promise<void> {
    await this.openMenu();
    await this.page.getByRole('button', { name: label }).click();
  }
}
