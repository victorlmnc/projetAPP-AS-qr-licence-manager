import { describe, it, expect } from 'vitest';
import { calculerStatutLicence, messageAdherent } from './licence.js';

const VALIDE = {
  questionnaire_sante_ok: true,
  paiement_global: true,
  manque_paiement: false,
  manque_yeps: false,
  manque_passport: false,
};

const QUESTIONNAIRE_MANQUANT = { ...VALIDE, questionnaire_sante_ok: false };
const PAIEMENT_MANQUANT = { ...VALIDE, paiement_global: false };
const TOUT_MANQUANT = { questionnaire_sante_ok: false, paiement_global: false };

describe('calculerStatutLicence', () => {
  it('retourne valide quand questionnaire et paiement sont à jour', () => {
    const r = calculerStatutLicence(VALIDE);
    expect(r.valide).toBe(true);
    expect(r.statut).toBe('valide');
    expect(r.couleur).toBe('vert');
    expect(r.anomalies).toHaveLength(0);
  });

  it('invalide si questionnaire manquant', () => {
    const r = calculerStatutLicence(QUESTIONNAIRE_MANQUANT);
    expect(r.valide).toBe(false);
    expect(r.couleur).toBe('rouge');
    expect(r.anomalies).toContain('Questionnaire santé manquant');
  });

  it('invalide si paiement non réglé', () => {
    const r = calculerStatutLicence(PAIEMENT_MANQUANT);
    expect(r.valide).toBe(false);
    expect(r.anomalies.some((a) => a.startsWith('Paiement non régularisé'))).toBe(true);
  });

  it("liste les manques détaillés dans l'anomalie paiement", () => {
    const a = calculerStatutLicence({
      ...PAIEMENT_MANQUANT,
      manque_paiement: true,
      manque_yeps: true,
    });
    expect(a.anomalies[0]).toContain('Paiement');
    expect(a.anomalies[0]).toContain('Aide YEPS');
  });

  it("liste PASS'SPORT dans les manques", () => {
    const r = calculerStatutLicence({ ...PAIEMENT_MANQUANT, manque_passport: true });
    expect(r.anomalies[0]).toContain("Aide PASS'SPORT");
  });

  it('invalide si les deux manquent — deux anomalies', () => {
    const r = calculerStatutLicence(TOUT_MANQUANT);
    expect(r.valide).toBe(false);
    expect(r.anomalies).toHaveLength(2);
  });

  it('tolère un adhérent null/undefined sans planter', () => {
    expect(() => calculerStatutLicence(null)).not.toThrow();
    expect(() => calculerStatutLicence(undefined)).not.toThrow();
    expect(calculerStatutLicence(null).valide).toBe(false);
  });

  it('tolère un objet vide', () => {
    const r = calculerStatutLicence({});
    expect(r.valide).toBe(false);
    expect(r.anomalies).toHaveLength(2);
  });
});

describe('messageAdherent', () => {
  it('message positif si valide', () => {
    const m = messageAdherent(VALIDE);
    expect(m).toContain('à jour');
  });

  it('message avec anomalies si non valide', () => {
    const m = messageAdherent(QUESTIONNAIRE_MANQUANT);
    expect(m).toContain('en cours de validation');
    expect(m).toContain('Questionnaire santé manquant');
  });
});
