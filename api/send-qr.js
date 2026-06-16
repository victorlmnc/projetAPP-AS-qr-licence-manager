import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { calculerStatutLicence } from '../src/lib/licence.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function emailHtml(prenom, nom, lien, relance = false) {
  const titre = relance ? 'Votre licence est à régulariser' : 'Votre QR Code de licence';
  const texte = relance
    ? 'Votre dossier de licence est incomplet. Consultez votre statut et contactez le bureau pour régulariser.'
    : 'Votre QR Code de licence est disponible. Présentez-le à votre responsable sportif lors des entraînements et des matchs.';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${titre}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f7;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 8px 30px rgba(94,58,140,0.08);overflow:hidden;">
          <tr>
            <td style="background:#5e3a8c;padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Association Sportive</p>
              <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                ${titre}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin:0 0 24px 0;color:#746d88;font-size:14px;line-height:1.6;">
                ${texte}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${lien}"
                       style="display:inline-block;background:#5e3a8c;color:#ffffff;text-decoration:none;
                              padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                      Voir mon QR Code
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#746d88;font-size:12px;text-align:center;line-height:1.5;">
                Vous pouvez aussi enregistrer cette page en favori sur votre téléphone.<br/>
                <a href="${lien}" style="color:#5e3a8c;word-break:break-all;">${lien}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eae4f5;">
              <p style="margin:0;color:#746d88;font-size:11px;text-align:center;">
                Envoyé par le bureau de l'Association Sportive. Ne pas répondre à cet email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adherentIds } = req.body ?? {};
  const relance = req.body?.mode === 'reminder';

  let adherents, error;

  if (Array.isArray(adherentIds) && adherentIds.length > 0) {
    ({ data: adherents, error } = await supabase
      .from('adherents')
      .select('id, public_token, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport')
      .in('id', adherentIds));
  } else {
    ({ data: adherents, error } = await supabase
      .from('adherents')
      .select('id, public_token, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport')
      .not('email', 'is', null)
      .order('nom'));
  }

  if (error) {
    return res.status(500).json({ error: 'Erreur Supabase : ' + error.message });
  }

  const batch = relance
    ? (adherents ?? []).filter((a) => !calculerStatutLicence(a).valide)
    : (adherents ?? []);

  const baseUrl = `https://${req.headers.host}`;
  const results = {
    sent: 0,
    errors: [],
  };
  for (const a of batch) {
    if (!a.email) continue;
    if (!a.public_token) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: 'Token public manquant.' });
      continue;
    }

    const lien = `${baseUrl}/adherent/${a.public_token}`;
    const subject = relance
      ? `Licence à régulariser — ${a.prenom} ${a.nom}`
      : `Votre QR Code de licence — ${a.prenom} ${a.nom}`;
    const text = relance
      ? `Bonjour ${a.prenom} ${a.nom},\n\nVotre licence est incomplète. Consultez votre statut ici : ${lien}\n\nMerci de contacter le bureau pour régulariser votre dossier.\n\n— Le bureau de l'Association Sportive`
      : `Bonjour ${a.prenom} ${a.nom},\n\nVotre QR Code de licence est disponible. Présentez-le à votre responsable sportif lors des entraînements et des matchs.\n\nAccéder à votre QR Code : ${lien}\n\nVous pouvez enregistrer cette page en favori sur votre téléphone.\n\n— Le bureau de l'Association Sportive`;

    try {
      await transporter.sendMail({
        from: `"Association Sportive" <${process.env.GMAIL_USER}>`,
        to: a.email,
        subject,
        text,
        html: emailHtml(a.prenom, a.nom, lien, relance),
      });
      results.sent++;
    } catch (err) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: err.message });
    }
  }

  return res.status(200).json(results);
}
