import { test, expect } from '@playwright/test';
import { ouvrir, attendreSansDebordement } from './outils.js';

const lignes = (page) => page.locator('.dash-table tbody tr');
const noms = (page) => page.locator('.dash-nom-col strong').allTextContents();

test.describe('Tableau de bord', () => {
  test('démo : compteurs et liste triée par nom', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await expect(lignes(page)).toHaveCount(5);
    await expect(page.locator('.stat-num')).toHaveText(['5', '3', '2']);
    expect(await noms(page)).toEqual(['Lucas Bernard', 'Emma Dubois', 'Jeanne Martin', 'Hugo Petit', 'Léa Robert']);
    await attendreSansDebordement(page);
  });

  test('pire cas : texte affiché tel quel, accents réparés, rien ne déborde', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await expect(lignes(page)).toHaveCount(14);
    await expect(page.getByText('Test <script>alert(1)</script>')).toBeVisible();
    await expect(page.getByText('François Lefèvre')).toBeVisible();
    await attendreSansDebordement(page);
  });

  test('pire cas : le tri ignore les espaces, la casse et les accents', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await expect(lignes(page)).toHaveCount(14);
    const liste = await noms(page);
    // « Đặng » est rangé avec les D, avant « de la Cruz » ; « dana lee » (saisi
    // avec des espaces) n'est pas en tête mais à sa place parmi les L.
    expect(liste.indexOf('Ngọc Hân Đặng Thị')).toBeLessThan(liste.indexOf('María José de la Cruz y Fernández'));
    expect(liste.indexOf('dana lee')).toBe(liste.indexOf('François Lefèvre') - 1);
  });

  test('pire cas : les actions de chaque adhérent restent dans l\'écran', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    const largeur = page.viewportSize().width;
    const boutons = page.getByRole('button', { name: 'Modifier', exact: true });
    await expect(boutons).toHaveCount(14);
    for (const bouton of await boutons.all()) {
      const boite = await bouton.boundingBox();
      expect(boite.x + boite.width).toBeLessThanOrEqual(largeur);
    }
  });

  test('base vide : message adapté et accès direct à l\'import', async ({ page }) => {
    await ouvrir(page, 'bureau', 'vide');
    await expect(page.getByText("Aucun adhérent pour l'instant.")).toBeVisible();
    await page.getByRole('button', { name: 'Importer le formulaire' }).click();
    await expect(page.getByRole('dialog', { name: 'Importer les données du forms' })).toBeVisible();
  });

  test('recherche sans résultat : on peut tout effacer', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('searchbox', { name: 'Rechercher un adhérent' }).fill('zzzz');
    await expect(page.getByText('Aucun adhérent ne correspond à la recherche ou aux filtres.')).toBeVisible();
    await page.getByRole('button', { name: 'Effacer la recherche et les filtres' }).click();
    await expect(lignes(page)).toHaveCount(5);
  });

  test('filtre « Non à jour »', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: 'Non à jour', exact: true }).click();
    expect(await noms(page)).toEqual(['Emma Dubois', 'Léa Robert']);
  });

  test('1 284 adhérents : nombres formatés et filtre fonctionnel', async ({ page }) => {
    await ouvrir(page, 'bureau', 'gros');
    await expect(page.locator('.stat-num').first()).toHaveText(/^1\s284$/);
    await expect(lignes(page)).toHaveCount(1284);
    await page.getByRole('searchbox', { name: 'Rechercher un adhérent' }).fill('adherent.12@');
    await expect(lignes(page)).toHaveCount(1);
  });
});
