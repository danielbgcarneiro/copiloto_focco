/**
 * Helper de login compartilhado pelos setups de cada papel.
 *
 * Fluxo real do Copiloto (src/components/auth/Login.tsx):
 *   1. Página "/" renderiza o formulário de login (heading "Bem-vindo")
 *   2. Preenche e-mail (input[type=email]) e senha (input[type=password])
 *   3. Clica em "Entrar no Sistema"
 *   4. login() → navigate('/home') → HomeRedirect:
 *        diretor → /gestao ; vendedor|gestor → /dashboard
 *   5. AppShell renderiza o AppTopBar, que SEMPRE tem o botão "Sair"
 *      (indicador de logado confiável para todos os papéis — o menu lateral
 *       só aparece para vendedor, por isso não serve de âncora universal).
 */
import { Page, expect } from '@playwright/test';
import path from 'path';

export async function loginAs(
  page: Page,
  creds: { email: string; password: string },
  storagePath: string,
  roleLabel: string,
): Promise<void> {
  if (!creds.email || !creds.password) {
    throw new Error(
      `Credenciais do papel "${roleLabel}" não definidas.\n` +
      `Defina PLAYWRIGHT_${roleLabel.toUpperCase()}_EMAIL e ` +
      `PLAYWRIGHT_${roleLabel.toUpperCase()}_PASS no .env antes de rodar os testes.`,
    );
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Aguarda o formulário de login renderizar
  await page.getByRole('heading', { name: 'Bem-vindo' }).waitFor({ state: 'visible', timeout: 30_000 });

  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: /Entrar no Sistema/i }).click();

  // Logado: AppTopBar com botão "Sair" visível em qualquer papel
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: 20_000 });
  // Garante que saímos da rota pública "/"
  await expect(page).not.toHaveURL(/\/$/, { timeout: 10_000 });

  await page.context().storageState({ path: path.resolve(storagePath) });
}
