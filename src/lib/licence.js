export function calculerStatutLicence(adherent) {
  const ficheOk = adherent?.questionnaire_sante_ok === true;
  const paiementOk = adherent?.paiement_global === true;
  const valide = ficheOk && paiementOk;

  const anomalies = [];

  if (!ficheOk) {
    anomalies.push('Questionnaire santé manquant');
  }

  if (!paiementOk) {
    const manques = [];
    if (adherent?.manque_paiement) manques.push('Paiement');
    if (adherent?.manque_yeps) manques.push('Aide YEPS (QR code et numéro)');
    if (adherent?.manque_passport) manques.push("Aide PASS'SPORT");

    // Sans détail coché, on garde un libellé général plutôt qu'un « Manque : » vide.
    anomalies.push(
      manques.length > 0
        ? `Manque : ${manques.join(', ')}`
        : 'Paiement non régularisé'
    );
  }

  return {
    valide,
    statut: valide ? 'valide' : 'non_valide',
    couleur: valide ? 'vert' : 'rouge',
    anomalies,
  };
}

// Ce que l'adhérent doit savoir sur sa licence, dans l'ordre d'affichage
// (emails et page publique). Les deux dernières lignes sont toujours présentes,
// que la réponse soit oui ou non.
export function recapitulatifLicence(adherent) {
  const types = Array.isArray(adherent?.types_licence) ? adherent.types_licence.filter(Boolean) : [];
  return [
    [types.length > 1 ? 'Types de licence' : 'Type de licence', types.length > 0 ? types.join(', ') : 'Non renseigné'],
    // Facultative : seulement nécessaire pour les compétitions universitaires.
    ['Licence FFSU', adherent?.licence_ffsu_a_jour ? 'Valide' : 'Non souscrite'],
    ['Activités à contraintes', adherent?.activite_contraintes ? 'Éligible' : 'Non éligible'],
  ];
}

// Démarche PASS'SPORT, expliquée aux adhérents à qui l'aide manque
// (emails et page publique) : l'adresse est séparée pour en faire un lien.
export const EMAIL_PASS_SPORT = 'sport-bourges@insa-cvl.fr';
export const PASS_SPORT_AVANT_EMAIL =
  "Pour utiliser votre Pass'Sport, prenez votre place au tarif normal, puis envoyez votre Pass'Sport et votre RIB par mail à";
export const PASS_SPORT_APRES_EMAIL = '. Nous vous rembourserons les 50 €.';

export function doitEnvoyerPassSport(adherent) {
  return adherent?.manque_passport === true && adherent?.paiement_global !== true;
}

export function messageAdherent(adherent) {
  const { valide, anomalies } = calculerStatutLicence(adherent);
  if (valide) {
    return 'Licence à jour. Vous pouvez participer aux entraînements et matchs.';
  }
  return 'Licence en cours de validation — ' + anomalies.join(' · ');
}
