import { describe, it, expect } from 'vitest';
import { emailQrCode, emailRelance, esc } from './emails.js';
import { calculerStatutLicence, recapitulatifLicence } from './licence.js';

const DATE = '16/06/2026';
const LIEN = 'https://exemple.test/adherent/11111111-1111-4111-8111-000000000001';

const aJour = {
  prenom: 'Jeanne', nom: 'Martin', types_licence: ['Sportive', 'Arbitre'],
  questionnaire_sante_ok: true, paiement_global: true,
  licence_ffsu_a_jour: true, activite_contraintes: false,
};
const incomplet = {
  prenom: 'Emma', nom: 'Dubois', types_licence: null,
  questionnaire_sante_ok: false, paiement_global: false, manque_paiement: true, manque_yeps: true,
};

describe('recapitulatifLicence', () => {
  it('liste tous les types de licence et dit oui comme non', () => {
    expect(recapitulatifLicence(aJour)).toEqual([
      ['Types de licence', 'Sportive, Arbitre'],
      ['Licence FFSU', 'Valide'],
      ['Activités à contraintes', 'Non éligible'],
    ]);
  });

  it('un seul type au singulier, aucun type renseigné', () => {
    expect(recapitulatifLicence({ types_licence: ['Encadrant'] })[0]).toEqual(['Type de licence', 'Encadrant']);
    expect(recapitulatifLicence(incomplet)).toEqual([
      ['Type de licence', 'Non renseigné'],
      ['Licence FFSU', 'Non souscrite'],
      ['Activités à contraintes', 'Non éligible'],
    ]);
  });
});

describe('emailQrCode', () => {
  it('dossier à jour : statut, récapitulatif de la licence et lien vers le QR Code', () => {
    const { sujet, texte, html } = emailQrCode(aJour, calculerStatutLicence(aJour), LIEN, DATE);
    expect(sujet).toBe('Votre QR Code de licence - Jeanne Martin');
    expect(html).toContain('Dossier complet et à jour.');
    expect(html).toContain('Votre licence');
    expect(html).toContain('Sportive, Arbitre');
    expect(html).toContain('Non éligible');
    expect(html).toContain(`href="${LIEN}"`);
    expect(texte).toContain('- Licence FFSU : Valide');
    expect(texte).toContain(`Lien du QR Code : ${LIEN}`);
  });

  it('dossier incomplet : date et liste de ce qui manque', () => {
    const { texte, html } = emailQrCode(incomplet, calculerStatutLicence(incomplet), LIEN, DATE);
    expect(html).toContain(`Dossier incomplet au ${DATE}.`);
    expect(html).not.toContain('Il manque');
    expect(html).toContain('<li style="margin:2px 0;">Questionnaire santé manquant</li>');
    expect(texte).toContain('- Manque : Paiement, Aide YEPS (QR code et numéro)');
    expect(texte).not.toContain('Paiement non régularisé');
  });

  it('aucune couleur de statut : ni aplat, ni pastille verte ou rouge', () => {
    for (const adherent of [aJour, incomplet]) {
      const { html } = emailQrCode(adherent, calculerStatutLicence(adherent), LIEN, DATE);
      expect(html).not.toContain('background:#4b2177');
      for (const couleur of ['#15803d', '#b91c1c', '#f0fdf4', '#fef2f2']) {
        expect(html).not.toContain(couleur);
      }
      expect(html).not.toContain('&#9679;');
    }
  });

  it('échappe le nom de l\'adhérent dans le HTML', () => {
    const malveillant = { ...aJour, nom: '<script>alert(1)</script>' };
    const { html } = emailQrCode(malveillant, calculerStatutLicence(malveillant), LIEN, DATE);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('emailRelance', () => {
  it('sujet, liste des manques, récapitulatif et aucun lien', () => {
    const { sujet, texte, html } = emailRelance(incomplet, calculerStatutLicence(incomplet), DATE);
    expect(sujet).toBe('Licence incomplète - Emma Dubois');
    expect(html).toContain(`Dossier incomplet au ${DATE}.`);
    expect(html).toContain('Votre licence');
    expect(html).not.toContain('href=');
    expect(texte).toContain('Pensez à régulariser votre situation auprès du bureau de l\'AS.');
  });
});

describe('esc', () => {
  it('neutralise les caractères HTML', () => {
    expect(esc(`<a href="x">L'AS & co</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;L&#x27;AS &amp; co&lt;/a&gt;');
  });
});
