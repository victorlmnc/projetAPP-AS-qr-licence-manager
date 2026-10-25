import { describe, it, expect } from 'vitest';
import { articlesMerch, merchARemettre, recapCommande, resumeArticles, SANS_TAILLE, taillesTriees } from './merch.js';

const ensembleFloque = {
  maillot: true, taille_maillot: 'M', maillot_recupere: true,
  flocage: true, texte_flocage: ' DUPONT ',
  short: true, taille_short: 'L', short_recupere: false,
};

describe('articlesMerch', () => {
  it('le flocage est une option du maillot', () => {
    expect(resumeArticles(articlesMerch(ensembleFloque))).toBe('Maillot (M, floqué « DUPONT »), Short (L)');
  });

  it('aucun article si rien n\'est commandé', () => {
    expect(articlesMerch({})).toEqual([]);
    expect(articlesMerch(null)).toEqual([]);
  });

  it('taille ou texte manquant', () => {
    expect(resumeArticles(articlesMerch({ maillot: true, flocage: true, texte_flocage: '  ' }))).toBe('Maillot (floqué)');
    expect(resumeArticles(articlesMerch({ maillot: true }))).toBe('Maillot');
  });

  it('un flocage sans maillot est ignoré', () => {
    expect(articlesMerch({ flocage: true, texte_flocage: 'JO' })).toEqual([]);
  });
});

describe('merchARemettre', () => {
  it('ne garde que les articles pas encore récupérés (le flocage suit le maillot)', () => {
    expect(merchARemettre(ensembleFloque).map((a) => a.cle)).toEqual(['short']);
  });
});

describe('recapCommande', () => {
  const adherents = [
    ensembleFloque,
    { maillot: true, taille_maillot: 'M' },
    { maillot: true, taille_maillot: 'XS', maillot_recupere: true },
    { maillot: true, flocage: true, texte_flocage: 'MARTIN' },
    { short: true, taille_short: 'L' },
    { flocage: true, texte_flocage: 'SANS MAILLOT' },
    {},
  ];
  const recap = recapCommande(adherents);

  it('compte les articles, les remises et les tailles', () => {
    expect(recap.maillot).toMatchObject({ total: 4, remis: 2 });
    expect(taillesTriees(recap.maillot.tailles)).toEqual([['XS', 1], ['M', 2], [SANS_TAILLE, 1]]);
    expect(recap.short).toMatchObject({ total: 2, remis: 0 });
    expect(taillesTriees(recap.short.tailles)).toEqual([['L', 2]]);
  });

  it('flocages : seulement sur un maillot, remis avec lui', () => {
    expect(recap.flocage).toMatchObject({ total: 2, remis: 1 });
    expect(recap.flocage.textes.map((f) => [f.texte, f.tailleMaillot, f.recupere])).toEqual([
      ['DUPONT', 'M', true],
      ['MARTIN', '', false],
    ]);
  });

  it('une taille inconnue (venue d\'un import) est gardée telle quelle, après les tailles connues', () => {
    expect(taillesTriees({ 'Taille unique': 1, S: 2 })).toEqual([['S', 2], ['Taille unique', 1]]);
  });
});
