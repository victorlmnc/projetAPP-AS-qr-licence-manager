import { describe, it, expect } from 'vitest';
import {
  articlesDepuisFormule, detecterColonnes, normaliserTaille, preparerImport, regrouperCommandes, resumeChangements,
} from './importMerch.js';

describe('articlesDepuisFormule', () => {
  it.each([
    ['Licence seule', { maillot: false, short: false, flocage: false }],
    ['Licence seul (avec YEPS)', { maillot: false, short: false, flocage: false }],
    ['Licence + maillot', { maillot: true, short: false, flocage: false }],
    ['Licence + maillot (avec YEPS)', { maillot: true, short: false, flocage: false }],
    ['Licence + ensemble (maillot+short)', { maillot: true, short: true, flocage: false }],
    ['Licence + ensemble (avec YEPS)', { maillot: true, short: true, flocage: false }],
    ['Maillot seul', { maillot: true, short: false, flocage: false }],
    ['Short seul', { maillot: false, short: true, flocage: false }],
    ['Flocage (nom au dos)', { maillot: false, short: false, flocage: true }],
  ])('%s', (formule, attendu) => {
    expect(articlesDepuisFormule(formule)).toEqual(attendu);
  });
});

describe('normaliserTaille', () => {
  it('reconnaît les écritures courantes', () => {
    expect(normaliserTaille('m')).toBe('M');
    expect(normaliserTaille('Taille : xl')).toBe('XL');
    expect(normaliserTaille('2XL')).toBe('XXL');
    expect(normaliserTaille('xxxl')).toBe('3XL');
    expect(normaliserTaille('Taille unique')).toBe('Taille unique');
    expect(normaliserTaille('  ')).toBeNull();
  });
});

describe('detecterColonnes', () => {
  it('export type site de paiement', () => {
    const colonnes = detecterColonnes([
      'Numéro de commande', 'Nom', 'Prénom', 'Email', 'Tarif', 'Taille du maillot', 'Nom au dos (flocage)',
    ]);
    expect(colonnes).toMatchObject({
      email: 'Email', nom: 'Nom', prenom: 'Prénom', formule: 'Tarif',
      tailleMaillot: 'Taille du maillot', texteFlocage: 'Nom au dos (flocage)',
    });
  });

  it('modèle de l\'application', () => {
    expect(detecterColonnes(['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage']))
      .toMatchObject({ formule: 'Formule', tailleMaillot: 'Taille maillot', tailleShort: 'Taille short', texteFlocage: 'Texte flocage' });
  });
});

describe('regrouperCommandes', () => {
  const colonnes = detecterColonnes(['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage']);
  const ligne = (email, formule, extra = {}) => ({ Email: email, Nom: 'X', Prénom: 'Y', Formule: formule, ...extra });

  it('regroupe les lignes d\'un même adhérent (une ligne par article)', () => {
    const [commande] = regrouperCommandes([
      ligne('Lucas@Example.com', 'Licence + maillot (avec YEPS)', { 'Taille maillot': 'l' }),
      ligne('lucas@example.com', 'Flocage (nom au dos)', { 'Texte flocage': 'BERNARD' }),
      ligne('lucas@example.com', 'Short seul', { 'Taille short': 'M' }),
    ], colonnes);
    expect(commande).toMatchObject({
      email: 'lucas@example.com', maillot: true, short: true, flocage: true,
      taille_maillot: 'L', taille_short: 'M', texte_flocage: 'BERNARD',
    });
  });
});

describe('preparerImport', () => {
  const adherents = [
    { id: 1, prenom: 'Lucas', nom: 'Bernard', email: 'lucas@example.com', maillot: false },
    { id: 2, prenom: 'Léa', nom: 'Robert', email: null, maillot: true, taille_maillot: 'S', maillot_recupere: true },
    { id: 3, prenom: 'Jo', nom: 'Wu', email: 'jo@example.com' },
  ];

  it('ajoute ce qui manque, retrouve par email ou par nom, signale le reste', () => {
    const { miseAJour, introuvables, avertissements } = preparerImport([
      { email: 'lucas@example.com', maillot: true, short: true, flocage: true, taille_maillot: 'L', taille_short: 'L', texte_flocage: 'BERNARD' },
      { email: '', nom: 'robert', prenom: 'lea', maillot: true, flocage: true, texte_flocage: 'ROBERT', taille_maillot: 'S' },
      { email: 'jo@example.com', flocage: true, texte_flocage: 'JO' },
      { email: 'inconnu@example.com', maillot: true },
    ], adherents);

    expect(miseAJour.map((m) => [m.adherent.id, m.changements])).toEqual([
      [1, { maillot: true, taille_maillot: 'L', flocage: true, texte_flocage: 'BERNARD', short: true, taille_short: 'L' }],
      // Maillot et taille déjà connus : seul le flocage est ajouté ; la remise n'est pas touchée.
      [2, { flocage: true, texte_flocage: 'ROBERT' }],
    ]);
    expect(introuvables.map((c) => c.email)).toEqual(['inconnu@example.com']);
    expect(avertissements).toEqual(['Jo Wu : flocage sans maillot, ignoré.']);
  });

  it('rien à faire si la fiche est déjà à jour', () => {
    expect(preparerImport([{ email: '', nom: 'Robert', prenom: 'Léa', maillot: true, taille_maillot: 'S' }], adherents).miseAJour).toEqual([]);
  });
});

describe('resumeChangements', () => {
  it('décrit ce que l\'import va noter', () => {
    expect(resumeChangements({ maillot: true, taille_maillot: 'L', flocage: true, texte_flocage: 'BERNARD', short: true }, {}))
      .toBe('Maillot (L), floqué « BERNARD », Short');
  });
});
