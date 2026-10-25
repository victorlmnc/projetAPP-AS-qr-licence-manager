import { test, expect } from '@playwright/test';
import { ouvrir, attendreSansDebordement, deborde } from './outils.js';

// Le jeu de données simule le résultat d'un scan, sans caméra.
test.describe('Scan terrain', () => {
  test('licence à jour', async ({ page }) => {
    await ouvrir(page, 'scan', 'demo');
    const resultat = page.locator('.scan-result');
    await expect(resultat.getByRole('heading', { name: 'Jeanne Martin' })).toBeVisible();
    await expect(resultat).toContainText('Licence à jour');
  });

  test('pire cas : nom long entier, statut et motifs affichés', async ({ page }) => {
    await ouvrir(page, 'scan', 'pire');
    const resultat = page.locator('.scan-result');
    await expect(resultat.getByRole('heading', { name: 'Aleksandra Wiśniewska-Kowalczyk' })).toBeVisible();
    await expect(resultat).toContainText('Licence non à jour');
    await expect(resultat.getByRole('listitem')).toHaveCount(2);
    expect(await deborde(resultat)).toBe(false);
    await attendreSansDebordement(page);
  });

  test('QR inconnu : message d\'erreur', async ({ page }) => {
    await ouvrir(page, 'scan', 'vide');
    await expect(page.getByRole('alert')).toHaveText('Adhérent introuvable ou QR invalide.');
  });

  test.describe('écran de 320 px', () => {
    test.use({ viewport: { width: 320, height: 700 } });

    test('le nom n\'est pas coupé par la carte', async ({ page }) => {
      await ouvrir(page, 'scan', 'pire');
      const resultat = page.locator('.scan-result');
      await expect(resultat.getByRole('heading')).toBeVisible();
      expect(await deborde(resultat)).toBe(false);
      await attendreSansDebordement(page);
    });
  });
});
