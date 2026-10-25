// Régénère les captures d'emails du tutoriel (public/tuto/) à partir du HTML
// réellement envoyé, sans rien envoyer. Non lancé par défaut :
//   TUTO=1 npx playwright test e2e/emails-tuto.spec.js --project=ordinateur
import { test } from '@playwright/test';
import { emailQrCode, emailRelance } from '../src/lib/emails.js';
import { calculerStatutLicence } from '../src/lib/licence.js';

test.skip(!process.env.TUTO, 'régénération manuelle uniquement');

const LIEN = 'https://as-licences-insa-cvl.vercel.app/adherent/3d1ca70c-6444-47e2-a2f5-66a46c1e5087';
const DATE = '16/06/2026';

const aJour = {
  prenom: 'Jeanne', nom: 'Martin',
  questionnaire_sante_ok: true, paiement_global: true, licence_ffsu_a_jour: true,
};
const incomplet = {
  prenom: 'Lucas', nom: 'Bernard',
  questionnaire_sante_ok: true, paiement_global: false, manque_paiement: true, manque_yeps: true,
};

const EMAILS = [
  ['envoi-emails-1', emailQrCode(aJour, calculerStatutLicence(aJour), LIEN, DATE)],
  ['envoi-emails-2', emailQrCode(incomplet, calculerStatutLicence(incomplet), LIEN, DATE)],
  ['envoi-emails-3', emailRelance(incomplet, calculerStatutLicence(incomplet), DATE)],
];

for (const [nom, email] of EMAILS) {
  test(nom, async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 900 });
    await page.setContent(email.html);
    // Capture de la carte seule, comme dans une boîte mail.
    await page.locator('table table').first().screenshot({ path: `public/tuto/${nom}.png` });
  });
}
