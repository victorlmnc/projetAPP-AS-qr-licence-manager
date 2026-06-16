import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { calculerStatutLicence } from '../src/lib/licence.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function emailHtml(prenom, nom, lien, relance = false) {
  const titre = relance ? 'Votre licence est a regulariser' : 'Votre QR Code de licence';
  const texte = relance
    ? 'Votre dossier de licence est incomplet. Consultez votre statut et contactez le bureau pour regulariser.'
    : 'Votre QR Code de licence est disponible. Presentez-le a votre responsable sportif lors des entrainements et des matchs.';
  const p = esc(prenom);
  const n = esc(nom);
  const l = esc(lien);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(titre)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f7;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 8px 30px rgba(94,58,140,0.08);overflow:hidden;">
          <tr>
            <td style="background:#5e3a8c;padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Association Sportive</p>
              <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${esc(titre)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${p} ${n}</strong>,
              </p>
              <p style="margin:0 0 24px 0;color:#746d88;font-size:14px;line-height:1.6;">${esc(texte)}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${l}" style="display:inline-block;background:#5e3a8c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                      Voir mon QR Code
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#746d88;font-size:12px;text-align:center;line-height:1.5;">
                Vous pouvez aussi enregistrer cette page en favori sur votre telephone.<br/>
                <a href="${l}" style="color:#5e3a8c;word-break:break-all;">${l}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eae4f5;">
              <p style="margin:0;color:#746d88;font-size:11px;text-align:center;">
                Envoye par le bureau de l'Association Sportive. Ne pas repondre a cet email.
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

async function requireBureau(req) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: 'Non authentifie', status: 401 };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'bureau') {
    return { error: 'Acces refuse - role bureau requis', status: 403 };
  }

  return { user };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireBureau(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { adherentIds, mode } = req.body ?? {};
  const relance = mode === 'reminder';

  let query = supabase
    .from('adherents')
    .select('id, public_token, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport');

  if (Array.isArray(adherentIds) && adherentIds.length > 0) {
    query = query.in('id', adherentIds);
  } else {
    query = query.not('email', 'is', null).order('nom');
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: 'Erreur Supabase : ' + error.message });
  }

  const batch = relance
    ? (data ?? []).filter((a) => !calculerStatutLicence(a).valide)
    : (data ?? []);

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return res.status(500).json({ error: 'APP_BASE_URL manquant dans les variables serveur.' });
  }

  const results = { sent: 0, errors: [] };

  for (const a of batch) {
    if (!a.email) continue;
    if (!a.public_token) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: 'Token public manquant.' });
      continue;
    }

    const lien = `${baseUrl}/adherent/${a.public_token}`;
    const subject = relance
      ? `Licence a regulariser - ${a.prenom} ${a.nom}`
      : `Votre QR Code de licence - ${a.prenom} ${a.nom}`;
    const text = relance
      ? `Bonjour ${a.prenom} ${a.nom},\n\nVotre licence est incomplete. Consultez votre statut ici : ${lien}\n\nMerci de contacter le bureau pour regulariser votre dossier.\n\n- Le bureau de l'Association Sportive`
      : `Bonjour ${a.prenom} ${a.nom},\n\nVotre QR Code de licence est disponible. Presentez-le a votre responsable sportif lors des entrainements et des matchs.\n\nAcceder a votre QR Code : ${lien}\n\nVous pouvez enregistrer cette page en favori sur votre telephone.\n\n- Le bureau de l'Association Sportive`;

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
