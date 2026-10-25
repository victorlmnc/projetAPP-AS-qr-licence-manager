import { test, expect } from '@playwright/test';
import { ouvrir, attendreSansDebordement } from './outils.js';

test.describe('Page publique adhérent', () => {
  test('dossier à jour : nom, QR code et message', async ({ page }) => {
    await ouvrir(page, 'adherent', 'demo');
    await expect(page.getByRole('heading', { level: 1, name: 'Jeanne Martin' })).toBeVisible();
    await expect(page.locator('.pub-qr canvas')).toBeVisible();
    await expect(page.getByText('Votre dossier est complet et à jour.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Télécharger le QR Code' })).toBeVisible();

    // Récapitulatif toujours complet, y compris quand la réponse est non.
    const recap = page.getByRole('region', { name: 'Votre licence' });
    await expect(recap.locator('dt')).toHaveText(['Type de licence', 'Licence FFSU', 'Activités à contraintes']);
    await expect(recap.locator('dd')).toHaveText(['Sportive', 'Valide', 'Non éligible']);
  });

  test('QR inconnu : message d\'erreur', async ({ page }) => {
    await ouvrir(page, 'adherent', 'vide');
    await expect(page.getByText('Aucun adhérent trouvé pour ce QR Code.')).toBeVisible();
  });

  test.describe('écran de 320 px', () => {
    test.use({ viewport: { width: 320, height: 700 } });

    test('pire cas : nom long et dossier incomplet, rien ne déborde', async ({ page }) => {
      await ouvrir(page, 'adherent', 'pire');
      await expect(page.getByRole('heading', { level: 1, name: 'Aleksandra Wiśniewska-Kowalczyk' })).toBeVisible();
      await expect(page.getByText(/Votre dossier est incomplet/)).toBeVisible();
      await expect(page.locator('.pub-statut li')).toHaveText([
        'Questionnaire santé manquant',
        'Manque : Paiement, Aide YEPS (QR code et numéro)',
      ]);
      await expect(page.getByRole('region', { name: 'Votre licence' }).locator('dd').nth(1)).toHaveText('Non souscrite');
      await attendreSansDebordement(page);
    });
  });
});
