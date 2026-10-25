// Captures des écrans principaux pour revue visuelle (non lancé par défaut :
// CAPTURES=1 npx playwright test e2e/captures.spec.js). Images dans test-results/.
import { test } from '@playwright/test';

test.skip(!process.env.CAPTURES, 'captures manuelles uniquement');

const ECRANS = [
  ['connexion', '/login'],
  ['bureau', '/dev/bureau?data=pire'],
  ['scan-ko', '/dev/scan?data=pire'],
  ['scan-ok', '/dev/scan?data=demo'],
  ['adherent', '/dev/adherent?data=pire'],
];

for (const [nom, url] of ECRANS) {
  test(nom, async ({ page }, testInfo) => {
    await page.goto(url);
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '[aria-label="Jeu de données de test"] { display: none !important; }' });
    await page.screenshot({ path: testInfo.outputPath(`${nom}.png`) });
  });
}

test('editeur', async ({ page }, testInfo) => {
  await page.goto('/dev/bureau?data=pire');
  await page.getByRole('button', { name: 'Modifier', exact: true }).nth(6).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath('editeur.png') });
});

test('envoi', async ({ page }, testInfo) => {
  await page.goto('/dev/bureau?data=demo');
  await page.getByRole('button', { name: /Envoyer les QR par email/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath('envoi.png') });
});
