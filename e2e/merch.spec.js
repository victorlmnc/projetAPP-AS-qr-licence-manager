import { test, expect } from '@playwright/test';
import { ouvrir, attendreSansDebordement } from './outils.js';

// Jeu « démo » : Jeanne (maillot M floqué MARTIN, à remettre), Lucas (ensemble
// L/L à remettre), Hugo (short S remis), Léa (maillot S remis).
const noms = (page) => page.locator('.dash-nom-col strong').allTextContents();
const ligne = (page, nom) => page.locator('.dash-table tbody tr').filter({ hasText: nom });

test.describe('Merch', () => {
  test('filtre « Merch à remettre » avec son compteur', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: 'Merch à remettre (2)' }).click();
    expect(await noms(page)).toEqual(['Lucas Bernard', 'Jeanne Martin']);
  });

  test('la colonne Détail indique ce qui reste à remettre, flocage compris', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await expect(ligne(page, 'Jeanne Martin').locator('.dash-merch')).toHaveText('Merch à remettre : Maillot (M, floqué « MARTIN »)');
    await expect(ligne(page, 'Léa Robert').locator('.dash-merch')).toHaveCount(0);
  });

  test('onglet Merch : le flocage est une option du maillot', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await ligne(page, 'Lucas Bernard').getByRole('button', { name: 'Modifier' }).click();
    await page.getByRole('tab', { name: 'Merch' }).click();

    await expect(page.getByLabel('Maillot commandé')).toBeChecked();
    await expect(page.getByLabel('Taille du maillot')).toHaveValue('L');
    await expect(page.getByLabel('Taille du short')).toHaveValue('L');
    await expect(page.getByLabel('Maillot récupéré')).not.toBeChecked();

    // Texte floqué seulement si le flocage est coché.
    await expect(page.getByLabel('Texte floqué')).toHaveCount(0);
    await page.getByLabel('Flocage (nom au dos)').check();
    await expect(page.getByLabel('Texte floqué')).toHaveAttribute('maxlength', '20');

    // Sans maillot, plus d'option de flocage.
    await page.getByLabel('Maillot commandé').uncheck();
    await expect(page.getByLabel('Flocage (nom au dos)')).toHaveCount(0);

    await page.getByLabel('Short commandé').uncheck();
    await expect(page.getByLabel('Taille du short')).toHaveCount(0);
  });

  test('récap de commande : quantités par taille et flocages', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Commande merch' });

    const maillots = fenetre.getByRole('region', { name: 'Maillots' });
    await expect(maillots).toContainText('3 commandés · 1 remis · 2 à remettre');
    await expect(maillots.locator('tbody tr')).toHaveText([/S\s*1/, /M\s*1/, /L\s*1/]);

    const shorts = fenetre.getByRole('region', { name: 'Shorts' });
    await expect(shorts).toContainText('2 commandés · 1 remis · 1 à remettre');
    await expect(shorts.locator('tbody tr')).toHaveText([/S\s*1/, /L\s*1/]);

    const flocages = fenetre.getByRole('region', { name: 'Flocages' });
    await expect(flocages).toContainText('1 commandé · 0 remis · 1 à remettre');
    await expect(flocages.locator('tbody tr')).toHaveText([/Jeanne Martin\s*MARTIN\s*M\s*Non/]);
    await expect(fenetre.getByRole('button', { name: 'Exporter en CSV' })).toBeVisible();
  });

  test('récap pire cas : tailles non précisées ou importées, rien ne déborde', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const maillots = page.getByRole('region', { name: 'Maillots' });
    await expect(maillots.locator('tbody tr')).toHaveText([/M\s*1/, /XL\s*1/, /Taille unique\s*1/, /Taille non précisée\s*1/]);
    const flocages = page.getByRole('region', { name: 'Flocages' });
    await expect(flocages).toContainText('WIŚNIEWSKA-KOWALCZYK');
    await expect(flocages).toContainText('JO');
    await attendreSansDebordement(page);
  });

  test('aucun merch : message dans le récap', async ({ page }) => {
    await ouvrir(page, 'bureau', 'vide');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    await expect(page.getByText("Aucun merch commandé pour l'instant.")).toBeVisible();
  });

  test('édition en masse : remise du maillot et du short', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('checkbox', { name: 'Sélectionner tous les adhérents visibles' }).check();
    await page.getByRole('button', { name: /Modifier la sélection/ }).click();
    const fenetre = page.getByRole('dialog', { name: 'Modifier la sélection' });
    await expect(fenetre.getByLabel('Maillot récupéré')).toHaveValue('ignore');
    await expect(fenetre.getByLabel('Short récupéré')).toHaveValue('ignore');
    await expect(fenetre.getByLabel('Flocage récupéré')).toHaveCount(0);
  });
});
