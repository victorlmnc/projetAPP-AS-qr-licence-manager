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
    valide,
    statut: valide ? 'valide' : 'non_valide',
    couleur: valide ? 'vert' : 'rouge',
    anomalies,
  };
}

export function messageAdherent(adherent) {
  const { valide, anomalies } = calculerStatutLicence(adherent);
  if (valide) {
    return 'Licence à jour. Vous pouvez participer aux entraînements et matchs.';
  }
  return 'Licence en cours de validation — ' + anomalies.join(' · ');
}
