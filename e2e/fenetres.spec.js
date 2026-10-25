import { test, expect } from '@playwright/test';
import { ouvrir, deborde } from './outils.js';

// Ouvre l'éditeur du premier adhérent du jeu « démo » (Lucas Bernard).
async function ouvrirEditeur(page) {
  await ouvrir(page, 'bureau', 'demo');
  const bouton = page.getByRole('button', { name: 'Modifier', exact: true }).first();
  await bouton.click();
  const editeur = page.getByRole('dialog', { name: 'Lucas Bernard' });
  await expect(editeur).toBeVisible();
  return { bouton, editeur };
}

test.describe('Éditeur de fiche', () => {
  test('centré à l\'écran', async ({ page }) => {
    await ouvrirEditeur(page);
    const boite = await page.locator('.editor').boundingBox();
    const { width } = page.viewportSize();
    expect(Math.abs(boite.x + boite.width / 2 - width / 2)).toBeLessThan(2);
  });

  test('sans modification : Échap ferme et rend le focus au bouton', async ({ page }) => {
    const { bouton, editeur } = await ouvrirEditeur(page);
    await page.keyboard.press('Escape');
    await expect(editeur).toBeHidden();
    await expect(bouton).toBeFocused();
  });

  test('avec modification : Échap demande confirmation avant de perdre la saisie', async ({ page }) => {
    const { editeur } = await ouvrirEditeur(page);
    await page.getByRole('tab', { name: 'Informations personnelles' }).click();
    await page.getByLabel('Téléphone').fill('06 12 34 56 78');

    await page.keyboard.press('Escape');
    const confirmation = page.getByRole('alertdialog', { name: 'Abandonner les modifications ?' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Continuer la saisie' }).click();
    await expect(confirmation).toBeHidden();
    await expect(page.getByLabel('Téléphone')).toHaveValue('06 12 34 56 78');

    await page.keyboard.press('Escape');
    await confirmation.getByRole('button', { name: 'Abandonner', exact: true }).click();
    await expect(editeur).toBeHidden();
  });

  test('sur téléphone : une seule colonne de champs, pleine largeur', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'telephone', 'mise en page téléphone uniquement');
    await ouvrirEditeur(page);
    await page.getByRole('tab', { name: 'Informations personnelles' }).click();

    for (const grille of await page.locator('.editor-grid').all()) {
      const colonnes = await grille.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(colonnes).toBe(1);
    }
    const largeurEditeur = (await page.locator('.editor').boundingBox()).width;
    for (const champ of ['Prénom', 'Date de naissance', 'Ville de naissance', 'Code postal']) {
      const largeurChamp = (await page.getByLabel(champ).boundingBox()).width;
      expect(largeurChamp, champ).toBeGreaterThan(largeurEditeur * 0.8);
    }
  });
});

test.describe('Envoi groupé', () => {
  test('nom et email lisibles en entier, homonymes distinguables', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await page.getByRole('button', { name: /Envoyer les QR par email/ }).click();
    const fenetre = page.getByRole('dialog', { name: 'Envoyer les QR Codes par email' });
    await expect(fenetre).toBeVisible();

    await expect(fenetre.getByText('thomas.martin@example.com', { exact: true })).toBeVisible();
    await expect(fenetre.getByText('thomas.martin2@example.com', { exact: true })).toBeVisible();

    const coupes = await fenetre.locator('.envoi-item__name, .envoi-item__email')
      .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
    expect(coupes).toEqual([]);
    expect(await deborde(fenetre.locator('.envoi-list'))).toBe(false);
  });

  test('Échap ferme la fenêtre', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: /Envoyer les QR par email/ }).click();
    const fenetre = page.getByRole('dialog', { name: 'Envoyer les QR Codes par email' });
    await expect(fenetre).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(fenetre).toBeHidden();
  });
});
