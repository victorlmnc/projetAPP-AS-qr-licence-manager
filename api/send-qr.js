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
  pool: true,        // réutilise la connexion SMTP entre les envois
  maxConnections: 1, // Gmail n'accepte qu'une connexion simultanée par compte
  maxMessages: 100,
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

function qrEmailHtml(prenom, nom, lien, valide, anomalies, licenceFFSU, activiteContraintes) {
  const p = esc(prenom);
  const n = esc(nom);
  const l = esc(lien);
  const dateDuJour = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

  const statusHtml = valide
    ? `<p style="margin:0 0 20px 0;color:#1e1b29;font-size:14px;font-weight:600;">Dossier complet et à jour.</p>`
    : `<p style="margin:0 0 4px 0;color:#1e1b29;font-size:14px;font-weight:600;">Attention, dossier incomplet (à la date du ${dateDuJour}).</p>
       <p style="margin:0 0 10px 0;color:#1e1b29;font-size:14px;font-weight:600;">Il manque :</p>
       <ul style="margin:0 0 20px 0;padding-left:20px;color:#746d88;font-size:14px;">
         ${anomalies.map((anomalie) => `<li style="margin:4px 0;">${esc(anomalie)}</li>`).join('')}
       </ul>`;

  const badgeStyle = (ok) => ok
    ? 'display:inline-block;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;background:#e7f6ef;color:#166534;border:1px solid rgba(22,101,52,0.2);'
    : 'display:inline-block;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;background:#f3f4f6;color:#6b7280;border:1px solid rgba(107,114,128,0.2);';

  const infoHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding:14px 16px;border-radius:10px;background:#f8f7fb;">
          <p style="margin:0 0 10px 0;color:#1e1b29;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Informations complémentaires</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span style="${badgeStyle(licenceFFSU)}">${licenceFFSU ? '✓' : '✗'} Licence FFSU</span>
            <span style="${badgeStyle(activiteContraintes)}">${activiteContraintes ? '✓' : '✗'} Activités à contraintes</span>
          </div>
        </td>
      </tr>
    </table>`;

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
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">AS de l'INSA CVL</p>
              <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Votre QR Code de licence</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${p} ${n}</strong>,
              </p>
              <p style="margin:0 0 20px 0;color:#746d88;font-size:14px;line-height:1.5;">
                Voici votre QR Code pour la saison sportive. Il vous sera demandé à l'entrée des entraînements.
              </p>
              ${statusHtml}
              ${infoHtml}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${l}" style="display:inline-block;background:#5e3a8c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                      Afficher mon QR Code
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#746d88;font-size:12px;text-align:center;line-height:1.5;">
                <a href="${l}" style="color:#5e3a8c;word-break:break-all;">${l}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eae4f5;">
              <p style="margin:0 0 6px 0;color:#b5460f;font-size:11px;text-align:center;font-weight:600;">
                Ceci est un e-mail automatique, merci de ne pas y repondre.
              </p>
              <p style="margin:0;color:#746d88;font-size:11px;text-align:center;line-height:1.5;">
                Cette adresse n'est pas surveillee et aucune reponse ne pourra etre traitee.<br/>
                Pour toute question, contactez directement un membre du bureau de l'AS de l'INSA CVL.
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

function reminderEmailHtml(prenom, nom, anomalies) {
  const p = esc(prenom);
  const n = esc(nom);
  const dateDuJour = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const items = anomalies
    .map((anomalie) => `<li style="margin:8px 0;color:#7c211c;font-size:14px;line-height:1.45;">${esc(anomalie)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Licence incomplete</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f7;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 8px 30px rgba(94,58,140,0.08);overflow:hidden;">
          <tr>
            <td style="background:#8f241e;padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">AS de l'INSA CVL</p>
              <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.82);font-size:13px;">Licence incomplete</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${p} ${n}</strong>,
              </p>
              <p style="margin:0 0 16px 0;color:#746d88;font-size:14px;line-height:1.5;">
                Votre dossier d'inscription n'est pas terminé (à la date du ${dateDuJour}). Il manque :
              </p>
              <ul style="margin:0 0 20px 0;padding-left:20px;">
                ${items}
              </ul>
              <p style="margin:0;color:#746d88;font-size:14px;line-height:1.5;">
                Pensez à régulariser votre situation rapidement auprès de l'AS.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eae4f5;">
              <p style="margin:0 0 6px 0;color:#b5460f;font-size:11px;text-align:center;font-weight:600;">
                Ceci est un e-mail automatique, merci de ne pas y repondre.
              </p>
              <p style="margin:0;color:#746d88;font-size:11px;text-align:center;line-height:1.5;">
                Cette adresse n'est pas surveillee et aucune reponse ne pourra etre traitee.<br/>
                Pour toute question, contactez directement un membre du bureau de l'AS de l'INSA CVL.
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
    .select('id, nom, prenom, email, public_token, questionnaire_sante_ok, paiement_global, manque_paiement, manque_yeps, manque_passport, licence_ffsu_a_jour, activite_contraintes');

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
  if (!relance && !baseUrl) {
    return res.status(500).json({ error: 'APP_BASE_URL manquant dans les variables serveur.' });
  }

  const results = { sent: 0, errors: [] };

  for (const a of batch) {
    if (!a.email) continue;
    if (!relance && !a.public_token) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: 'Token public manquant.' });
      continue;
    }

    const statut = calculerStatutLicence(a);
    const anomalies = statut.anomalies.length > 0 ? statut.anomalies : ['Dossier de licence incomplet'];
    const lien = relance ? null : `${baseUrl}/adherent/${a.public_token}`;
    const subject = relance
      ? `Licence incomplete - ${a.prenom} ${a.nom}`
      : `Votre QR Code de licence - ${a.prenom} ${a.nom}`;
    
    const dateDuJour = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
    const qrTextStatus = statut.valide 
      ? `Dossier complet et a jour.`
      : `Attention, dossier incomplet (a la date du ${dateDuJour}). Il manque :\n- ${anomalies.join('\n- ')}`;

    const infoTexte = [
      `Licence FFSU : ${a.licence_ffsu_a_jour ? 'Oui' : 'Non'}`,
      `Activites a contraintes : ${a.activite_contraintes ? 'Oui' : 'Non'}`,
    ].join('\n');

    const text = relance
      ? `Bonjour ${a.prenom} ${a.nom},\n\nVotre dossier d'inscription n'est pas termine (a la date du ${dateDuJour}). Il manque :\n- ${anomalies.join('\n- ')}\n\nPensez a regulariser votre situation aupres de l'AS.\n\n- Le bureau de l'AS INSA CVL`
      : `Bonjour ${a.prenom} ${a.nom},\n\nVoici votre QR Code pour la saison sportive. Il vous sera demande a l'entree des entrainements.\n\n${qrTextStatus}\n\n${infoTexte}\n\nLien du QR Code : ${lien}\n\n- Le bureau de l'AS INSA CVL`;

    try {
      await transporter.sendMail({
        from: `"AS de l'INSA CVL (ne pas repondre)" <${process.env.GMAIL_USER}>`,
        to: a.email,
        subject,
        text,
        html: relance
          ? reminderEmailHtml(a.prenom, a.nom, anomalies)
          : qrEmailHtml(a.prenom, a.nom, lien, statut.valide, anomalies, a.licence_ffsu_a_jour, a.activite_contraintes),
      });
      results.sent++;
    } catch (err) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: err.message });
    }
  }

  return res.status(200).json(results);
}
