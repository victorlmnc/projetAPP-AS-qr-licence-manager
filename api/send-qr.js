import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const LIMITE_PAR_JOUR = 450;

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
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function emailHtml(prenom, nom, lien) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Votre QR Code de licence</title>
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
                Accès à votre QR Code de licence
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin:0 0 24px 0;color:#746d88;font-size:14px;line-height:1.6;">
                Votre QR Code de licence est disponible. Présentez-le à votre responsable sportif
                lors des entraînements et des matchs.
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

  // Récupère tous les adhérents qui n'ont jamais reçu le mail et qui ont un email
  const { data: adherents, error } = await supabase
    .from('adherents')
    .select('id, nom, prenom, email')
    .is('qr_envoye_le', null)
    .not('email', 'is', null)
    .order('nom');

  if (error) {
    return res.status(500).json({ error: 'Erreur Supabase : ' + error.message });
  }

  const totalRestant = adherents.length;
  const batch = adherents.slice(0, LIMITE_PAR_JOUR);
  const baseUrl = `https://${req.headers.host}`;
  const results = { sent: 0, remaining: Math.max(0, totalRestant - LIMITE_PAR_JOUR), errors: [] };

  const idEnvoyes = [];

  for (const a of batch) {
    const lien = `${baseUrl}/adherent/${a.id}`;
    try {
      await transporter.sendMail({
        from: `"Association Sportive" <${process.env.GMAIL_USER}>`,
        to: a.email,
        subject: `Votre QR Code de licence — ${a.prenom} ${a.nom}`,
        text: `Bonjour ${a.prenom} ${a.nom},\n\nVotre QR Code de licence est disponible. Présentez-le à votre responsable sportif lors des entraînements et des matchs.\n\nAccéder à votre QR Code : ${lien}\n\nVous pouvez enregistrer cette page en favori sur votre téléphone.\n\n— Le bureau de l'Association Sportive`,
        html: emailHtml(a.prenom, a.nom, lien),
      });
      idEnvoyes.push(a.id);
      results.sent++;
    } catch (err) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: err.message });
    }
  }

  // Marque les envois réussis en base
  if (idEnvoyes.length > 0) {
    await supabase
      .from('adherents')
      .update({ qr_envoye_le: new Date().toISOString() })
      .in('id', idEnvoyes);
  }

  return res.status(200).json(results);
}
