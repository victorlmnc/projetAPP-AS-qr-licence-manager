import { describe, it, expect } from 'vitest';
import {
  articlesDepuisFormule, detecterColonnes, normaliserTaille, preparerImport, regrouperCommandes, resumeChangements,
} from './importMerch.js';

describe('articlesDepuisFormule', () => {
  it.each([
    ['Licence seule', { maillot: false, short: false, flocage: false, yeps: false }],
    ['Licence seul (avec YEPS)', { maillot: false, short: false, flocage: false, yeps: true }],
    ['Licence + maillot', { maillot: true, short: false, flocage: false, yeps: false }],
    ['Licence + maillot (avec YEPS)', { maillot: true, short: false, flocage: false, yeps: true }],
    ['Licence + ensemble (maillot+short)', { maillot: true, short: true, flocage: false, yeps: false }],
    ['Licence + ensemble (avec YEPS)', { maillot: true, short: true, flocage: false, yeps: true }],
    ['Maillot seul', { maillot: true, short: false, flocage: false, yeps: false }],
    ['Short seul', { maillot: false, short: true, flocage: false, yeps: false }],
    ['Flocage (nom au dos)', { maillot: false, short: false, flocage: true, yeps: false }],
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
  it('export HelloAsso : colonnes de l\'adhérent plutôt que du payeur, montants ignorés', () => {
    const colonnes = detecterColonnes([
      'Référence commande', 'Date de la commande', 'Statut de la commande',
      'Nom payeur', 'Prénom payeur', 'Email payeur',
      'Nom adhérent', 'Prénom adhérent', 'Email adhérent',
      'Montant tarif', 'Tarif', 'Options', 'Montant des options',
      'Taille du maillot', 'Nom à floquer',
    ]);
    expect(colonnes).toMatchObject({
      email: 'Email adhérent', nom: 'Nom adhérent', prenom: 'Prénom adhérent',
      formule: 'Tarif', options: ['Options'], statut: 'Statut de la commande',
      tailleMaillot: 'Taille du maillot', texteFlocage: 'Nom à floquer',
    });
  });

  it('seulement le payeur : on l\'utilise en dernier recours', () => {
    expect(detecterColonnes(['Nom payeur', 'Prénom payeur', 'Email payeur', 'Nom de l\'article']))
      .toMatchObject({ email: 'Email payeur', nom: 'Nom payeur', prenom: 'Prénom payeur', formule: 'Nom de l\'article' });
  });

  it('modèle de l\'application', () => {
    expect(detecterColonnes(['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage']))
      .toMatchObject({ formule: 'Formule', tailleMaillot: 'Taille maillot', tailleShort: 'Taille short', texteFlocage: 'Texte flocage' });
  });
});

describe('regrouperCommandes', () => {
  const colonnes = detecterColonnes(['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage', 'Statut']);
  const ligne = (email, formule, extra = {}) => ({ Email: email, Nom: 'X', Prénom: 'Y', Formule: formule, Statut: 'Validé', ...extra });

  it('regroupe les lignes d\'un même adhérent (une ligne par article)', () => {
    const { commandes } = regrouperCommandes([
      ligne('Lucas@Example.com', 'Licence + maillot (avec YEPS)', { 'Taille maillot': 'l' }),
      ligne('lucas@example.com', 'Flocage (nom au dos)', { 'Texte flocage': 'BERNARD' }),
      ligne('lucas@example.com', 'Short seul', { 'Taille short': 'M' }),
    ], colonnes);
    expect(commandes).toHaveLength(1);
    expect(commandes[0]).toMatchObject({
      email: 'lucas@example.com', maillot: true, short: true, flocage: true, yeps: true,
      taille_maillot: 'L', taille_short: 'M', texte_flocage: 'BERNARD',
    });
  });

  it('ignore les commandes remboursées ou annulées', () => {
    const { commandes, lignesAnnulees } = regrouperCommandes([
      ligne('a@example.com', 'Maillot seul', { Statut: 'Remboursée' }),
      ligne('b@example.com', 'Maillot seul', { Statut: 'Annulé' }),
      ligne('c@example.com', 'Maillot seul'),
    ], colonnes);
    expect(lignesAnnulees).toBe(2);
    expect(commandes.map((c) => c.email)).toEqual(['c@example.com']);
  });

  it('le flocage en option du tarif est reconnu', () => {
    const avecOptions = detecterColonnes(['Email', 'Tarif', 'Options', 'Nom à floquer']);
    const { commandes } = regrouperCommandes(
      [{ Email: 'd@example.com', Tarif: 'Licence + maillot', Options: 'Flocage (nom au dos)', 'Nom à floquer': 'DUPONT' }],
      avecOptions
    );
    expect(commandes[0]).toMatchObject({ maillot: true, flocage: true, texte_flocage: 'DUPONT' });
  });
});

describe('preparerImport', () => {
  const adherents = [
    { id: 1, prenom: 'Lucas', nom: 'Bernard', email: 'lucas@example.com', maillot: false, paiement_global: false, manque_yeps: false },
    { id: 2, prenom: 'Léa', nom: 'Robert', email: null, maillot: true, taille_maillot: 'S', maillot_recupere: true, paiement_global: true },
    { id: 3, prenom: 'Jo', nom: 'Wu', email: 'jo@example.com' },
  ];

  it('ajoute ce qui manque, retrouve par email ou par nom, signale le reste', () => {
    const { miseAJour, introuvables, avertissements } = preparerImport([
      { email: 'lucas@example.com', maillot: true, short: true, flocage: true, yeps: true, taille_maillot: 'L', taille_short: 'L', texte_flocage: 'BERNARD' },
      { email: '', nom: 'robert', prenom: 'lea', maillot: true, flocage: true, yeps: true, texte_flocage: 'ROBERT', taille_maillot: 'S' },
      { email: 'jo@example.com', flocage: true, texte_flocage: 'JO' },
      { email: 'inconnu@example.com', maillot: true },
    ], adherents);

    expect(miseAJour.map((m) => [m.adherent.id, m.changements])).toEqual([
      [1, { maillot: true, taille_maillot: 'L', flocage: true, texte_flocage: 'BERNARD', short: true, taille_short: 'L', manque_yeps: true }],
      // Paiement déjà complet : la case YEPS n'est pas cochée ; la remise n'est pas touchée.
      [2, { flocage: true, texte_flocage: 'ROBERT' }],
    ]);
    expect(introuvables.map((c) => c.email)).toEqual(['inconnu@example.com']);
    expect(avertissements).toEqual(['Jo Wu : flocage sans maillot, ignoré.']);
  });

  it('licence seule avec YEPS : la case est cochée même sans merch', () => {
    const { miseAJour } = preparerImport([{ email: 'lucas@example.com', yeps: true }], adherents);
    expect(miseAJour.map((m) => m.changements)).toEqual([{ manque_yeps: true }]);
  });

  it('rien à faire si la fiche est déjà à jour', () => {
    expect(preparerImport([{ email: '', nom: 'Robert', prenom: 'Léa', maillot: true, taille_maillot: 'S' }], adherents).miseAJour).toEqual([]);
  });
});

describe('resumeChangements', () => {
  it('décrit ce que l\'import va noter', () => {
    expect(resumeChangements({ maillot: true, taille_maillot: 'L', flocage: true, texte_flocage: 'BERNARD', short: true, manque_yeps: true }, {}))
      .toBe('Maillot (L), floqué « BERNARD », Short, aide YEPS (QR code et numéro) à fournir');
  });
});
