import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Autenticação — login público', () => {
  test('renderiza o formulário de login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await expect(login.heading).toBeVisible();
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitBtn).toBeVisible();
  });

  test('campos obrigatórios impedem submit vazio (permanece em "/")', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submitBtn.click();
    // HTML required bloqueia → continua na rota de login
    await expect(login.heading).toBeVisible();
  });

  test('credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('nao-existe@focco.test', 'senha-errada-123');

    await expect(login.errorAlert).toBeVisible({ timeout: 20_000 });
  });

  test('rota protegida sem sessão redireciona para login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible({ timeout: 20_000 });
  });
});
