import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Página de Clientes (src/components/pages/Clientes.tsx).
 * Alta complexidade ciclomática — alvo de regressão antes de refatorar.
 * Acessada via /rotas/:rotaId/cidades/:cidadeNome/clientes.
 */
export class ClientesPage extends BasePage {
  get busca(): Locator {
    return this.page.getByPlaceholder('Buscar óticas / bairro...');
  }

  get carregando(): Locator {
    return this.page.getByText('Carregando clientes...');
  }

  async buscar(termo: string): Promise<void> {
    await this.busca.fill(termo);
  }

  async expectCarregada(): Promise<void> {
    await this.expectLoaded();
    await expect(this.pageTitle('Clientes')).toBeVisible();
  }
}
