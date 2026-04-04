import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Point de Vente (POS)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('affiche la page caisse', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.getByRole('heading', { name: /Caisse/i })).toBeVisible();
    await expect(page.locator('input[type="search"], input[placeholder*="echerch"]').first()).toBeVisible();
    await expect(page.getByText(/Panier vide/i)).toBeVisible();
  });

  test('affiche les moyens de paiement', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.getByRole('button', { name: /Espèces/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Carte/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mobile/i })).toBeVisible();
  });

  test('affiche le panier vide', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.getByText(/Panier vide/i)).toBeVisible();
  });

  test('permet de rechercher un produit', async ({ page }) => {
    await page.goto('/pos');
    const searchInput = page.locator('input[type="search"], input[placeholder*="echerch"]').first();
    await searchInput.fill('Coca');
    await expect(searchInput).toHaveValue('Coca');
  });
});
