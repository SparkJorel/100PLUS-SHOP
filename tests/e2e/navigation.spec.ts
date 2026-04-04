import { test, expect } from '@playwright/test';
import { login } from './helpers';

const routes = [
  { path: '/', heading: /Tableau de bord/i },
  { path: '/pos', heading: /Caisse/i },
  { path: '/products', heading: /Produits/i },
  { path: '/stock', heading: /Stock/i },
  { path: '/customers', heading: /Clients/i },
  { path: '/sales', heading: /Ventes/i },
  { path: '/reports', heading: /Rapports/i },
  { path: '/cash-register', heading: /Caisse/i },
  { path: '/expenses', heading: /Dépenses/i },
  { path: '/credits', heading: /Créances|Crédits/i },
  { path: '/accounting', heading: /Comptabilité/i },
  { path: '/suppliers', heading: /Fournisseur/i },
  { path: '/inventory', heading: /Inventaire/i },
  { path: '/invoices', heading: /Facture/i },
  { path: '/users', heading: /Utilisateur/i },
  { path: '/activity-log', heading: /Activité|Journal/i },
];

test.describe('Navigation sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of routes) {
    test(`navigue vers ${route.path} et affiche le bon titre`, async ({ page }) => {
      await page.goto(route.path);
      // Look for the page heading in main content area, not in the header/sidebar
      await expect(page.locator('main')).toContainText(route.heading, { timeout: 20000 });
    });
  }
});
