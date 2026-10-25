import { describe, it, expect } from 'vitest';
import { comparerParNom, nomComplet } from './texte.js';

const noms = (liste) => liste.map((a) => a.nom);

describe('comparerParNom', () => {
  it('ignore les espaces en début et fin de nom', () => {
    const tries = [{ nom: 'Martin' }, { nom: ' lee  ' }, { nom: 'Bernard' }].sort(comparerParNom);
    expect(noms(tries)).toEqual(['Bernard', ' lee  ', 'Martin']);
  });

  it('ne tient compte ni de la casse ni des accents', () => {
    const tries = [{ nom: 'Dubois' }, { nom: 'Đặng' }, { nom: 'dana' }, { nom: 'Écart' }, { nom: 'Eymard' }]
      .sort(comparerParNom);
    expect(noms(tries)).toEqual(['dana', 'Đặng', 'Dubois', 'Écart', 'Eymard']);
  });

  it('trie sur le texte réparé, pas sur le mojibake', () => {
    const tries = [{ nom: 'Lefort' }, { nom: 'LefÃ¨vre' }].sort(comparerParNom);
    expect(noms(tries)).toEqual(['LefÃ¨vre', 'Lefort']);
  });

  it('départage les homonymes par le prénom', () => {
    const tries = [{ nom: 'Martin', prenom: 'Thomas' }, { nom: 'Martin', prenom: 'Jeanne' }].sort(comparerParNom);
    expect(tries.map((a) => a.prenom)).toEqual(['Jeanne', 'Thomas']);
  });

  it('supporte un nom manquant', () => {
    expect(() => [{ nom: null }, { nom: 'Martin' }].sort(comparerParNom)).not.toThrow();
  });
});

describe('nomComplet', () => {
  it('réduit les espaces superflus', () => {
    expect(nomComplet({ prenom: '  dana ', nom: ' lee  ' })).toBe('dana lee');
  });
});
