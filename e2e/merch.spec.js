import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { ouvrir, attendreSansDebordement } from './outils.js';

// Texte d'un PDF, extrait comme le ferait un lecteur PDF (police intégrée comprise).
async function texteDuPdf(chemin) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(chemin)) }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const contenu = await (await pdf.getPage(n)).getTextContent();
    pages.push(contenu.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n');
}

// Télécharge la commande fournisseur et renvoie chaque onglet sous forme de lignes.
async function telechargerCommande(page) {
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger la commande (Excel)' }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^commande-merch-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const classeur = XLSX.read(fs.readFileSync(await telechargement.path()), { type: 'buffer' });
  return Object.fromEntries(
    classeur.SheetNames.map((nom) => [nom, XLSX.utils.sheet_to_json(classeur.Sheets[nom], { header: 1 })])
  );
}

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
    // Rien à compléter dans le jeu démo.
    await expect(fenetre.locator('.recap-merch__alerte')).toHaveCount(0);
  });

  test('commande fournisseur : une information par case, aucun nom d\'adhérent', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const onglets = await telechargerCommande(page);

    expect(Object.keys(onglets)).toEqual(['Quantités par taille', 'Flocages']);

    const parTaille = onglets['Quantités par taille'];
    expect(parTaille[0][0]).toBe("Commande merch : Association Sportive de l'INSA CVL (Bourges)");
    expect(parTaille[2][0]).toBe('Contact : asso.sportive-bourges@insa-cvl.fr');
    expect(parTaille.slice(4)).toEqual([
      ['Taille', 'Maillots', 'Dont floqués', 'Shorts'],
      ['S', 1, 0, 1],
      ['M', 1, 1, 0],
      ['L', 1, 0, 1],
      ['Total', 3, 1, 2],
    ]);

    expect(onglets.Flocages.slice(4)).toEqual([
      ['Taille du maillot', 'Texte à floquer au dos', 'Quantité'],
      ['M', 'MARTIN', 1],
    ]);

    expect(JSON.stringify(onglets)).not.toMatch(/Jeanne|Lucas|Hugo|Léa|Emma|example\.com/);
  });

  test('récap pire cas : tailles non précisées ou importées, rien ne déborde', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const maillots = page.getByRole('region', { name: 'Maillots' });
    await expect(maillots.locator('tbody tr')).toHaveText([/M\s*1/, /XL\s*1/, /Taille unique\s*1/, /Taille non précisée\s*1/]);
    const flocages = page.getByRole('region', { name: 'Flocages' });
    await expect(flocages).toContainText('WIŚNIEWSKA-KOWALCZYK');
    await expect(flocages).toContainText('JO');
    await expect(page.locator('.recap-merch__alerte')).toHaveText(
      "À compléter avant d'envoyer la commande : 1 maillot sans taille."
    );
    await attendreSansDebordement(page);

    // La taille manquante apparaît « À préciser » dans le fichier.
    const onglets = await telechargerCommande(page);
    expect(onglets['Quantités par taille']).toContainEqual(['À préciser', 1, 0, 0]);
  });

  test('bon de commande PDF : quantités et flocages, aucun nom d\'adhérent', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Bon de commande (PDF)' }).click(),
    ]);
    expect(telechargement.suggestedFilename()).toMatch(/^bon-de-commande-merch-\d{4}-\d{2}-\d{2}\.pdf$/);

    const texte = await texteDuPdf(await telechargement.path());
    for (const attendu of ['Bon de commande merch', 'Quantités par taille', 'Dont floqués', 'Total', 'MARTIN', 'Page 1 / 1']) {
      expect(texte).toContain(attendu);
    }
    expect(texte).not.toMatch(/Jeanne|Lucas|Hugo|Léa|example\.com/);
  });

  test('bon de commande PDF : les lettres accentuées des flocages sont conservées', async ({ page }) => {
    await ouvrir(page, 'bureau', 'pire');
    await page.getByRole('button', { name: 'Commande merch' }).click();
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Bon de commande (PDF)' }).click(),
    ]);
    const texte = await texteDuPdf(await telechargement.path());
    expect(texte).toContain('WIŚNIEWSKA-KOWALCZYK');
    expect(texte).toContain('À préciser avant production : 1 maillot sans taille.');
  });

  test('import des commandes : aperçu avant d\'appliquer', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.locator('summary', { hasText: 'Importer' }).click();
    await page.getByRole('button', { name: 'Commandes de merch' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Importer des commandes de merch' });

    // Export façon HelloAsso : séparateur « ; », payeur distinct de l'adhérent,
    // flocage en option du tarif, une commande remboursée.
    const csv = [
      'Référence commande;Statut de la commande;Nom payeur;Prénom payeur;Email payeur;Nom adhérent;Prénom adhérent;Email adhérent;Tarif;Montant tarif;Options;Taille du maillot;Nom à floquer',
      '1001;Validé;Bernard;Marc;marc.bernard@example.com;Bernard;Lucas;LUCAS.BERNARD@example.com;Licence + ensemble (avec YEPS);55;Flocage (nom au dos);xl;BERNARD',
      '1002;Validé;Dubois;Emma;emma.dubois@example.com;Dubois;Emma;emma.dubois@example.com;Licence seul (avec YEPS);25;;;',
      '1003;Validé;Petit;Hugo;hugo.petit@example.com;Petit;Hugo;hugo.petit@example.com;Flocage (nom au dos);8;;;PETIT',
      '1004;Remboursée;Robert;Léa;lea.robert@example.com;Robert;Léa;lea.robert@example.com;Licence + ensemble;55;;;',
      '1005;Validé;Inconnu;Paul;paul@example.com;Inconnu;Paul;paul@example.com;Maillot seul;30;;M;',
    ].join('\n');
    await fenetre.locator('input[type="file"]').setInputFiles({
      name: 'export-helloasso.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf-8'),
    });

    const apercu = fenetre.getByLabel("Aperçu de l'import");
    await expect(apercu).toContainText('5 ligne(s) lue(s), dont 1 commande(s) remboursée(s) ou annulée(s) ignorée(s)');
    await expect(apercu).toContainText('Email → « Email adhérent »');
    await expect(apercu).toContainText('Formule → « Tarif »');
    await expect(apercu.locator('tbody tr')).toHaveText([
      // Lucas a déjà payé (paiement complet) : la case YEPS n'est pas cochée.
      /Lucas Bernard\s*Maillot \(XL\), floqué « BERNARD »/,
      /Emma Dubois\s*aide YEPS \(QR code et numéro\) à fournir/,
    ]);
    await expect(apercu).toContainText('paul@example.com');
    await expect(apercu).toContainText('Hugo Petit : flocage sans maillot, ignoré.');
    await expect(apercu).not.toContainText('Léa Robert');
    await expect(fenetre.getByRole('button', { name: 'Appliquer (2)' })).toBeVisible();
  });

  test('import des commandes : le modèle se télécharge', async ({ page }) => {
    await ouvrir(page, 'bureau', 'demo');
    await page.locator('summary', { hasText: 'Importer' }).click();
    await page.getByRole('button', { name: 'Commandes de merch' }).click();
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Télécharger le modèle' }).click(),
    ]);
    const classeur = XLSX.read(fs.readFileSync(await telechargement.path()), { type: 'buffer' });
    const [entetes] = XLSX.utils.sheet_to_json(classeur.Sheets.Commandes, { header: 1 });
    expect(entetes).toEqual(['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage']);
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
