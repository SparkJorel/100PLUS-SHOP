import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Gestion des produits', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('affiche la page produits', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main')).toContainText(/Produits/i);
  });

  test('ouvre le modal nouveau produit', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: /Nouveau produit/i }).click();
    // The modal should show with a form containing "Nom du produit" label
    await expect(page.getByText('Nom du produit')).toBeVisible({ timeout: 5000 });
  });

  test('affiche les boutons export et codes-barres', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByText(/Exporter CSV/i)).toBeVisible();
    await expect(page.getByText(/Codes-barres/i)).toBeVisible();
  });
});
