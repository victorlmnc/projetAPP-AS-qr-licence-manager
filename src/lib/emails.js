// Contenu des emails envoyés aux adhérents (utilisé par api/send-qr.js).
// Mise en page en tableaux et styles en ligne : c'est ce que les clients mail
// (Gmail, Outlook…) affichent de façon fiable. Mêmes gris que le site, sans
// couleur de statut : c'est le texte qui dit si le dossier est complet.

import { recapitulatifLicence } from './licence.js';

const C = {
  fond: '#f4f4f5',
  carte: '#ffffff',
  encadre: '#fafafa',
  ligne: '#e4e4e7',
  ligneForte: '#d4d4d8',
  texte: '#18181b',
  texte2: '#3f3f46',
  discret: '#71717a',
  accent: '#4b2177',
};

const POLICE = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SIGNATURE = "Le bureau de l'AS INSA CVL";
const AVERTISSEMENT = "Cet email est envoyé automatiquement : les réponses ne sont pas lues. Pour toute question, adressez-vous à un membre du bureau de l'AS : ethan.minier@insa-cvl.fr ou asso.sportive-bourges@insa-cvl.fr";

export function esc(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Date du jour au format français, heure de Paris (16/06/2026).
export function dateDuJour() {
  return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function gabarit(titre, contenu) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titre}</title>
</head>
<body style="margin:0;padding:0;background:${C.fond};font-family:${POLICE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.carte};border:1px solid ${C.ligne};border-radius:12px;">
          <tr>
            <td style="padding:28px 28px 0 28px;">
              <p style="margin:0 0 4px 0;color:${C.discret};font-size:13px;">AS de l'INSA CVL</p>
              <h1 style="margin:0;color:${C.texte};font-size:20px;font-weight:600;line-height:1.3;">${titre}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;color:${C.texte2};font-size:15px;line-height:1.55;">
              ${contenu}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid ${C.ligne};color:${C.discret};font-size:12px;line-height:1.5;">
              ${AVERTISSEMENT}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function salutation(prenom, nom) {
  return `<p style="margin:0 0 12px 0;color:${C.texte};">Bonjour ${esc(prenom)} ${esc(nom)},</p>`;
}

// Encadré neutre, sans couleur de statut.
function blocStatut(valide, anomalies, date) {
  const titre = valide ? 'Dossier complet et à jour.' : `Dossier incomplet au ${esc(date)}.`;
  const liste = valide
    ? ''
    : `<ul style="margin:6px 0 0 0;padding-left:22px;color:${C.texte2};">${anomalies
      .map((a) => `<li style="margin:2px 0;">${esc(a)}</li>`)
      .join('')}</ul>`;

  return `<div style="margin:0 0 20px 0;padding:12px 14px;background:${C.encadre};border:1px solid ${C.ligne};border-radius:8px;">
                <p style="margin:0;color:${C.texte};font-weight:600;">${titre}</p>
                ${liste}
              </div>`;
}

function blocLicence(adherent) {
  const lignes = recapitulatifLicence(adherent);
  const rangees = lignes
    .map(([libelle, valeur], i) => {
      const bordure = i < lignes.length - 1 ? `border-bottom:1px solid ${C.ligne};` : '';
      return `<tr>
                  <td style="padding:9px 14px;${bordure}color:${C.discret};font-size:14px;">${esc(libelle)}</td>
                  <td style="padding:9px 14px;${bordure}color:${C.texte};font-size:14px;font-weight:500;text-align:right;">${esc(valeur)}</td>
                </tr>`;
    })
    .join('');

  return `<p style="margin:0 0 8px 0;color:${C.texte};font-weight:600;">Votre licence</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid ${C.ligne};border-radius:8px;border-collapse:separate;">
                ${rangees}
              </table>`;
}

function texteLicence(adherent) {
  return `Votre licence :\n${recapitulatifLicence(adherent).map(([l, v]) => `- ${l} : ${v}`).join('\n')}`;
}

// Le motif est vide si l'adhérent n'a aucune anomalie listée (cas improbable).
function anomaliesOuDefaut(statut) {
  return statut.anomalies.length > 0 ? statut.anomalies : ['Dossier de licence incomplet'];
}

/**
 * Email d'envoi du QR Code.
 * @param adherent  { prenom, nom, types_licence, licence_ffsu_a_jour, activite_contraintes }
 * @param statut    résultat de calculerStatutLicence(adherent)
 * @param lien      URL de la page publique de l'adhérent
 * @param date      date affichée pour un dossier incomplet
 * @returns { sujet, texte, html }
 */
export function emailQrCode(adherent, statut, lien, date = dateDuJour()) {
  const anomalies = anomaliesOuDefaut(statut);

  const html = gabarit('Votre QR Code de licence', `
              ${salutation(adherent.prenom, adherent.nom)}
              <p style="margin:0 0 20px 0;">Voici votre QR Code pour la saison sportive. Il vous sera demandé à l'entrée des entraînements.</p>
              ${blocStatut(statut.valide, anomalies, date)}
              ${blocLicence(adherent)}
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:${C.carte};border:1px solid ${C.ligneForte};">
                    <a href="${esc(lien)}" style="display:inline-block;padding:11px 20px;color:${C.texte};font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Afficher mon QR Code</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;color:${C.discret};font-size:12px;line-height:1.5;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                <a href="${esc(lien)}" style="color:${C.accent};word-break:break-all;">${esc(lien)}</a>
              </p>`);

  const statutTexte = statut.valide
    ? 'Dossier complet et à jour.'
    : `Dossier incomplet au ${date}.\n- ${anomalies.join('\n- ')}`;

  const texte = `Bonjour ${adherent.prenom} ${adherent.nom},

Voici votre QR Code pour la saison sportive. Il vous sera demandé à l'entrée des entraînements.

${statutTexte}

${texteLicence(adherent)}

Lien du QR Code : ${lien}

${SIGNATURE}
${AVERTISSEMENT}`;

  return { sujet: `Votre QR Code de licence - ${adherent.prenom} ${adherent.nom}`, texte, html };
}

/**
 * Email de relance d'un dossier incomplet.
 * @returns { sujet, texte, html }
 */
export function emailRelance(adherent, statut, date = dateDuJour()) {
  const anomalies = anomaliesOuDefaut(statut);

  const html = gabarit('Dossier de licence incomplet', `
              ${salutation(adherent.prenom, adherent.nom)}
              <p style="margin:0 0 20px 0;">Votre dossier d'inscription à l'AS n'est pas encore complet.</p>
              ${blocStatut(false, anomalies, date)}
              ${blocLicence(adherent)}
              <p style="margin:0;">Pensez à régulariser votre situation auprès du bureau de l'AS.</p>`);

  const texte = `Bonjour ${adherent.prenom} ${adherent.nom},

Votre dossier d'inscription à l'AS n'est pas encore complet.

Dossier incomplet au ${date}.
- ${anomalies.join('\n- ')}

${texteLicence(adherent)}

Pensez à régulariser votre situation auprès du bureau de l'AS.

${SIGNATURE}
${AVERTISSEMENT}`;

  return { sujet: `Licence incomplète - ${adherent.prenom} ${adherent.nom}`, texte, html };
}
