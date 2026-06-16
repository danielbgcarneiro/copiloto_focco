import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Página de login pública ("/") — src/components/auth/Login.tsx.
 * Inputs não têm label associada (htmlFor), então ancoramos por type.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Bem-vindo' });
  }

  get emailInput(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get submitBtn(): Locator {
    return this.page.getByRole('button', { name: /Entrar no Sistema/i });
  }

  /** Alerta de erro (credenciais inválidas, etc.) */
  get errorAlert(): Locator {
    return this.page.locator('.bg-red-50');
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(this.heading).toBeVisible({ timeout: 30_000 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }
}
