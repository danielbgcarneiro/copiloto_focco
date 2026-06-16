import { test as setup } from '@playwright/test';
import { AUTH_PATHS, TEST_USERS } from '../fixtures/auth';
import { loginAs } from './login';

setup('autenticar vendedor', async ({ page }) => {
  await loginAs(page, TEST_USERS.vendedor, AUTH_PATHS.vendedor, 'vendedor');
});
