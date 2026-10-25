import { describe, it, expect } from 'vitest';
import { mapperLigne, normaliserEntetes } from './importForms.js';
import { lireTableur } from './fichierTableur.js';

// Questions du formulaire « Licence AS 2026-2027 », dans l'ordre de l'export.
const QUESTIONS = {
  horodateur: 'Horodateur',
  nom: 'Nom',
  prenom: 'Prénom',
  sexe: 'Sexe',
  promo: 'Promo',
  naissance: 'Date de naissance',
  pays: 'Pays de naissance',
  departement: 'Numéro du département de naissance\n',
  villeNaissance: 'Ville de naissance',
  adresse: 'Adresse',
  codePostal: 'Code postal',
  ville: 'Ville',
  telephone: 'Numéro de téléphone',
  email: 'Email',
  sport: 'Sport principal',
  competitions: "Je vais participer aux compétitions universitaire (le High Five n'est pas une compétition FFSU)",
  ancien: "J'étais licencié(e) à l'AS INSA CVL l'année dernière",
  licence: 'Je souhaite prendre une licence :',
  responsable: "Es-tu responsable d'un AS ?",
  honorabilite: "Ne pas répondre si vous n'êtes pas respo\n\nInformation Ministère des Sports :\n\nLa licence que je sollicite me permet d'accéder aux fonctions d'éducateur sportif et/ou d'exploitant d'établissement d'activités physiques et sportives au sens des articles L.212-1 et L.322-1 du code du sport et/ou aux fonctions d'arbitre au sens de l'article L.223-1 du code du sport.\nJ'atteste avoir compris l'objet du contrôle d'honorabilité pour les encadrants et dirigeants.",
  boursier: 'Je suis boursier et éligible au Pass sport',
  handicap: 'Je suis une personne en situation de handicap',
  image: "J'autorise l'utilisation de mon image par l'AS INSA CVL ou ses partenaires",
  sante: "J'ai répondu NON à toutes les questions du questionnaire de santé (je peux pratiquer TOUTES les activités sans contrainte particulière et sans fournir de certificat médical)",
  contraintes: "Je souhaite pratiquer une activité à contraintes particulières (Boxe(s) combat plein contact, tir sportif, biathlon, karting, pentathlon moderner avec tir, taekwondo combat, kickboxing combat)\n\net atteste avoir présenté un certificat médical de non contre-indication à la pratique des sports de compétition de moins d'un an",
};

const REPONSES = {
  horodateur: '2026/09/14 18:02:11 UTC+2',
  nom: 'Martin',
  prenom: 'Jeanne',
  sexe: 'F',
  promo: '3A STI Alternant',
  naissance: '2004-05-12',
  pays: 'France',
  departement: '18',
  villeNaissance: 'Bourges',
  adresse: '88 boulevard Lahitolle',
  codePostal: '18000',
  ville: 'Bourges',
  telephone: '0612345678',
  email: 'Jeanne.Martin@insa-cvl.fr',
  sport: 'Badminton',
  competitions: 'Oui',
  ancien: 'Non',
  licence: 'Sportive;Arbitre',
  responsable: 'Non',
  honorabilite: '',
  boursier: 'Non, je ne suis pas boursier',
  handicap: 'Non',
  image: 'Oui',
  sante: "J'ai répondu NON à toutes les questions",
  contraintes: 'Non je ne souhaite pas pratiquer une activité à contraintes',
};

// Ligne lue dans le fichier, en-têtes normalisés comme à l'import.
function ligne(reponses = {}) {
  const valeurs = { ...REPONSES, ...reponses };
  return normaliserEntetes(
    Object.fromEntries(Object.entries(QUESTIONS).map(([cle, question]) => [question, valeurs[cle]]))
  );
}

describe('mapperLigne (formulaire 2026-2027)', () => {
  it('lit chaque question dans le bon champ', () => {
    expect(mapperLigne(ligne())).toEqual({
      nom: 'Martin',
      prenom: 'Jeanne',
      email: 'jeanne.martin@insa-cvl.fr',
      sexe: 'F',
      annee_etude: '3A STI Alternant',
      date_naissance: '2004-05-12',
      pays_naissance: 'France',
      dept_naissance: '18',
      ville_naissance: 'Bourges',
      adresse: '88 boulevard Lahitolle',
      code_postal: '18000',
      ville: 'Bourges',
      telephone: '0612345678',
      types_licence: ['Sportive', 'Arbitre'],
      est_responsable_as: false,
      situation_handicap: false,
      droit_image: true,
      questionnaire_sante_ok: true,
      activite_contraintes: false,
      manque_paiement: true,
    });
  });

  it("refus du droit à l'image", () => {
    expect(mapperLigne(ligne({ image: 'Non' })).droit_image).toBe(false);
  });

  it('questionnaire santé avec une réponse OUI, activité à contraintes', () => {
    const a = mapperLigne(ligne({
      sante: "Je n'ai pas répondu NON à toutes les questions",
      contraintes: 'Oui je souhaite pratiquer une activité à contraintes',
    }));
    expect(a.questionnaire_sante_ok).toBe(false);
    expect(a.activite_contraintes).toBe(true);
  });

  it('licence Encadrant pour un responsable', () => {
    const a = mapperLigne(ligne({ licence: "Encadrant (responsable d'un AS)", responsable: 'Oui' }));
    expect(a.types_licence).toEqual(['Encadrant']);
    expect(a.est_responsable_as).toBe(true);
  });

  it('plusieurs licences séparées par une virgule (export Google Sheets)', () => {
    const a = mapperLigne(ligne({ licence: "Sportive, Arbitre, Encadrant (responsable d'un AS)" }));
    expect(a.types_licence).toEqual(['Sportive', 'Arbitre', 'Encadrant']);
  });

  it("l'adresse email collectée par Google ne remplace pas la question Email", () => {
    const a = mapperLigne({ 'adresse e-mail': 'autre@gmail.com', ...ligne() });
    expect(a.email).toBe('jeanne.martin@insa-cvl.fr');
    expect(a.adresse).toBe('88 boulevard Lahitolle');
  });
});

describe('fichier exporté, lu comme à l\'import', () => {
  const titres = Object.values(QUESTIONS);
  const reponses = Object.keys(QUESTIONS).map((cle) => REPONSES[cle]);

  it('CSV de Google Forms : en-têtes sur plusieurs lignes entre guillemets', async () => {
    const csv = [titres, reponses]
      .map((cellules) => cellules.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const lignes = await lireTableur(new File([csv], 'reponses.csv'));
    const a = mapperLigne(normaliserEntetes(lignes[0]));
    expect(a.annee_etude).toBe('3A STI Alternant');
    expect(a.dept_naissance).toBe('18');
    expect(a.types_licence).toEqual(['Sportive', 'Arbitre']);
  });

  it('Excel de Google Sheets : la date de naissance reste une date lisible', async () => {
    const XLSX = await import('xlsx');
    const feuille = XLSX.utils.aoa_to_sheet([titres, reponses.map((r, i) => (i === 5 ? new Date(2004, 4, 12) : r))], { cellDates: true });
    feuille.F2.z = 'dd/mm/yyyy';
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Réponses');
    const fichier = new File([XLSX.write(classeur, { type: 'array', bookType: 'xlsx' })], 'reponses.xlsx');

    const a = mapperLigne(normaliserEntetes((await lireTableur(fichier))[0]));
    expect(a.date_naissance).toBe('12/05/2004');
    expect(a.nom).toBe('Martin');
  });
});
