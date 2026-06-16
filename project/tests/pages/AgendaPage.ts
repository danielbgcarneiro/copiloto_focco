import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Módulo Agenda do vendedor (src/components/pages/Agenda.tsx).
 * Módulo com bugs críticos conhecidos — alvo prioritário dos E2E.
 */
export class AgendaPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/agenda', { waitUntil: 'domcontentloaded' });
    await this.expectLoaded();
    await expect(this.pageTitle('Agenda')).toBeVisible();
  }

  /** FAB de adicionar/expandir ações (aria-label "Adicionar"/"Fechar menu"). */
  get fab(): Locator {
    return this.page.getByRole('button', { name: /Adicionar|Fechar menu/ });
  }

  /** Estado de lista vazia do dia. */
  get vazioDia(): Locator {
    return this.page.getByText('Nenhuma visita agendada para este dia');
  }

  /** Estado de carregamento. */
  get carregando(): Locator {
    return this.page.getByText('Carregando…');
  }

  /** Mensagem de erro de carregamento dos agendamentos. */
  get erroCarregamento(): Locator {
    return this.page.getByText(/Não foi possível carregar os agendamentos/);
  }
}
