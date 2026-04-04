import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test('affiche la page de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('redirige vers login si non authentifié', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('affiche erreur avec mauvais identifiants', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    // The error is displayed in a div with bg-red-50 class
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 15000 });
  });

  test('affiche le lien mot de passe oublié', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Mot de passe oublié').click();
    // After clicking, a reset form appears with text about reset
    await expect(page.getByText('lien de réinitialisation')).toBeVisible();
  });
});
