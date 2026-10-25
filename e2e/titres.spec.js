import { test, expect } from '@playwright/test';

// Titre de l'onglet : la page d'abord, puis le nom du site.
const TITRES = [
  ['/login', 'Connexion · AS INSA CVL'],
  ['/dev/bureau?data=demo', 'Bureau · AS INSA CVL'],
  ['/dev/scan?data=demo', 'Scan · AS INSA CVL'],
  ['/dev/adherent?data=demo', 'Ma licence · AS INSA CVL'],
];

for (const [url, titre] of TITRES) {
  test(`titre de l'onglet : ${titre}`, async ({ page }) => {
    await page.goto(url);
    await expect(page).toHaveTitle(titre);
  });
}
