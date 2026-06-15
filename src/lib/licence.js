// ============================================================
// Logique métier PARTAGÉE — calcul du statut d'une licence.
//
// Tout le monde importe ces fonctions. Ne JAMAIS recoder ce
// calcul ailleurs : une seule règle, un seul endroit, zéro
// incohérence entre les écrans.
// ============================================================

// Forme d'un objet "adherent" tel que stocké en base :
//   {
//     id, nom, prenom, email,
//     fiche_renseignement: boolean,   // case du Bureau
//     paiement_global:     boolean,   // case du Bureau
//     manque_paiement:     boolean,   // détail si paiement non à jour
//     manque_yeps:         boolean,
//     manque_passport:    boolean,
//   }

// Règle officielle (cahier des charges) :
// Licence "à jour" UNIQUEMENT si fiche_renseignement ET paiement_global.
export function calculerStatutLicence(adherent) {
  const ficheOk = adherent?.fiche_renseignement === true;
  const paiementOk = adherent?.paiement_global === true;
  const valide = ficheOk && paiementOk;

  const anomalies = [];

  if (!ficheOk) {
    anomalies.push('Fiche de renseignement manquante');
  }

  if (!paiementOk) {
    const manques = [];
    if (adherent?.manque_paiement) manques.push('Paiement');
    if (adherent?.manque_yeps) manques.push('Aide YEPS');
    if (adherent?.manque_passport) manques.push("Aide PASS'SPORT");

    anomalies.push(
      manques.length > 0
        ? `Paiement non régularisé. Manque : ${manques.join(', ')}`
        : 'Paiement non régularisé'
    );
  }

  return {
    valide,                                   // true / false
    statut: valide ? 'valide' : 'non_valide', // libellé court
    couleur: valide ? 'vert' : 'rouge',       // couleur du bandeau
    anomalies,                                // liste de motifs lisibles
  };
}

// Message d'avancement destiné à l'adhérent (vue lecture seule).
export function messageAdherent(adherent) {
  const { valide, anomalies } = calculerStatutLicence(adherent);
  if (valide) {
    return 'Licence à jour. Vous pouvez participer aux entraînements et matchs.';
  }
  return 'Licence en cours de validation — ' + anomalies.join(' · ');
}
