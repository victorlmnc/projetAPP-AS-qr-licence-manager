// Import de l'export du formulaire d'inscription (Google Forms, CSV ou Excel).
// Les colonnes sont reconnues par un morceau de l'intitulé de la question,
// sur les en-têtes passés par normaliserEntetes().

import { normaliser, reparerTexte, versBool } from './texte.js';

// En-têtes normalisés pour que lire() les retrouve, valeurs en texte.
export function normaliserEntetes(row) {
  return Object.fromEntries(
    Object.entries(row).map(([entete, valeur]) => [normaliser(entete), String(valeur ?? '')])
  );
}

// Cherche la valeur d'une colonne dont la clé normalisée correspond à l'un des patterns.
// Essaie d'abord la correspondance exacte, puis substring.
function lire(row, ...patterns) {
  for (const pattern of patterns) {
    if (row[pattern] !== undefined) return String(row[pattern] ?? '');
    const cle = Object.keys(row).find((k) => k.includes(pattern));
    if (cle !== undefined) return String(row[cle] ?? '');
  }
  return '';
}

// Réponses d'une question à cases : séparées par « ; » dans le CSV de
// Google Forms, par « , » dans Google Sheets.
function choixMultiples(valeur) {
  return valeur.split(/[;,]/).map((choix) => choix.trim()).filter(Boolean);
}

export function mapperLigne(row) {
  const licenceRaw = lire(row, 'je souhaite prendre une licence');
  const types_licence = choixMultiples(licenceRaw).flatMap((t) => {
    const n = normaliser(t);
    if (n.includes('sportive')) return ['Sportive'];
    if (n.includes('arbitre')) return ['Arbitre'];
    if (n.includes('encadrant') || (n.includes('responsable') && n.includes('sport'))) return ['Encadrant'];
    return [];
  });

  // Questionnaire santé : "J'ai répondu NON à toutes les questions" = OK (pas de certificat)
  const santeRaw = lire(row, 'questionnaire de sante', "j'ai repondu non a toutes");
  const questionnaire_sante_ok = santeRaw !== '' && !normaliser(santeRaw).includes("n'ai pas");

  // Activité à contraintes particulières
  const contraintesRaw = lire(row, 'activite a contraintes', 'contraintes particulieres');
  const activite_contraintes = normaliser(contraintesRaw).startsWith('oui');

  // Droit à l'image
  const droitRaw = lire(row, 'utilisation de mon image', 'autorisation droit', "droit a l");
  const droit_image = versBool(droitRaw);

  // Situation de handicap
  const handicapRaw = lire(row, 'situation de handicap');
  const situation_handicap = versBool(handicapRaw);

  // Responsable d'une AS (colonne séparée du forms)
  const respRaw = lire(row, "es-tu responsable");
  const est_responsable_as = versBool(respRaw);

  // Attestation du contrôle d'honorabilité, posée aux seuls responsables.
  const honorabilite_attestee = versBool(lire(row, 'honorabilite'));

  const sports = [...new Set(choixMultiples(lire(row, 'sport principal')))];
  const competitions_universitaires = versBool(lire(row, 'competitions universitaire'));
  const licencie_annee_derniere = versBool(lire(row, 'annee derniere'));
  // « Oui, je suis boursier » / « Non, je ne suis pas boursier ».
  const boursier = normaliser(lire(row, 'boursier')).startsWith('oui');

  const nom = reparerTexte(lire(row, 'nom')).trim();
  const prenom = reparerTexte(lire(row, 'prenom')).trim();
  const email = lire(row, 'email').trim().toLowerCase() || null;

  return {
    nom,
    prenom,
    email,
    sexe: lire(row, 'sexe').trim() || null,
    // « Promo » d'abord : « annee » seul trouverait aussi « licencié l'année dernière ».
    annee_etude: lire(row, 'promo', 'annee').trim() || null,
    date_naissance: lire(row, 'date de naissance').trim() || null,
    pays_naissance: reparerTexte(lire(row, 'pays de naissance')).trim() || null,
    dept_naissance: lire(row, 'numero du departement').trim() || null,
    ville_naissance: reparerTexte(lire(row, 'ville de naissance')).trim() || null,
    adresse: reparerTexte(lire(row, 'adresse')).trim() || null,
    code_postal: lire(row, 'code postal').trim() || null,
    // Accès direct pour éviter les conflits avec "ville de naissance"
    ville: reparerTexte(String(row['ville'] ?? '')).trim() || null,
    telephone: lire(row, 'numero de telephone').trim() || null,
    types_licence: types_licence.length > 0 ? types_licence : null,
    est_responsable_as,
    honorabilite_attestee,
    sports: sports.length > 0 ? sports : null,
    competitions_universitaires,
    licencie_annee_derniere,
    boursier,
    situation_handicap,
    droit_image,
    questionnaire_sante_ok,
    activite_contraintes,
    manque_paiement: true,
  };
}
