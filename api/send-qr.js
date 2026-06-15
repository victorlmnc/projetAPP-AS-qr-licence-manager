import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { calculerStatutLicence } from '../src/lib/licence.js';

const LIMITE_PAR_APPEL = 15;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServerSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuration serveur Supabase manquante.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Configuration Gmail manquante.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function requireBureau(req, supabase) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { error: 'Connexion bureau requise.', status: 401 };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return { error: 'Session invalide.', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || profile?.role !== 'bureau') {
    return { error: 'Acces reserve au bureau.', status: 403 };
  }

  return { user: authData.user };
}

function emailHtml(prenom, nom, lien, relance) {
  const titre = relance ? 'Votre licence est a regulariser' : 'Votre QR Code de licence';
  const texte = relance
    ? 'Votre dossier de licence est incomplet. Consultez votre statut et contactez le bureau pour regulariser.'
    : 'Votre QR Code de licence est disponible. Presentez-le a votre responsable sportif lors des entrainements et des matchs.';

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
              <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${titre}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:#1e1b29;font-size:16px;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin:0 0 24px 0;color:#746d88;font-size:14px;line-height:1.6;">${texte}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${lien}" style="display:inline-block;background:#5e3a8c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                      Voir mon QR Code
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#746d88;font-size:12px;text-align:center;line-height:1.5;">
                <a href="${lien}" style="color:#5e3a8c;word-break:break-all;">${lien}</a>
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

  try {
    const supabase = getServerSupabase();
    const auth = await requireBureau(req, supabase);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { adherentIds, mode } = req.body ?? {};
    const relance = mode === 'reminder';
    const ids = Array.isArray(adherentIds)
      ? adherentIds.filter((id) => typeof id === 'string' && id.length <= 80).slice(0, 500)
      : [];

    const cibleSpecifique = ids.length > 0;
    let query = supabase
      .from('adherents')
      .select('id, public_token, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport');

    if (cibleSpecifique) {
      query = query.in('id', ids);
    } else {
      query = query.not('email', 'is', null);
      if (!relance) query = query.is('qr_envoye_le', null);
    }

    const { data, error } = await query.order('nom');
    if (error) {
      return res.status(500).json({ error: 'Erreur Supabase : ' + error.message });
    }

    const adherents = relance
      ? (data ?? []).filter((a) => !calculerStatutLicence(a).valide)
      : (data ?? []);
    const batch = adherents.slice(0, LIMITE_PAR_APPEL);

    const baseUrl = `https://${req.headers.host}`;
    const transporter = getTransporter();
    const results = {
      sent: 0,
      skipped: 0,
      remaining: Math.max(0, adherents.length - LIMITE_PAR_APPEL),
      errors: [],
    };

    for (const a of batch) {
      if (!a.email) {
        results.skipped++;
        continue;
      }

      if (!a.public_token) {
        results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: 'Token public manquant.' });
        continue;
      }

      const lien = `${baseUrl}/adherent/${a.public_token}`;
      const subject = relance
        ? `Licence a regulariser - ${a.prenom} ${a.nom}`
        : `Votre QR Code de licence - ${a.prenom} ${a.nom}`;
      const text = relance
        ? `Bonjour ${a.prenom} ${a.nom},\n\nVotre licence est incomplete. Consultez votre statut ici : ${lien}\n\nMerci de contacter le bureau pour regulariser votre dossier.\n\nLe bureau de l'Association Sportive`
        : `Bonjour ${a.prenom} ${a.nom},\n\nVotre QR Code de licence est disponible ici : ${lien}\n\nPresentez-le au coach lors du controle terrain.\n\nLe bureau de l'Association Sportive`;

      try {
        await transporter.sendMail({
          from: `"Association Sportive" <${process.env.GMAIL_USER}>`,
          to: a.email,
          subject,
          text,
          html: emailHtml(a.prenom, a.nom, lien, relance),
        });
        await supabase
          .from('adherents')
          .update({ qr_envoye_le: new Date().toISOString() })
          .eq('id', a.id);
        results.sent++;
      } catch (err) {
        results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: err.message });
      }
    }

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
