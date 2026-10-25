import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { calculerStatutLicence } from '../src/lib/licence.js';
import { emailQrCode, emailRelance } from '../src/lib/emails.js';

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

async function requireBureau(req) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: 'Non authentifié', status: 401 };
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
    return { error: 'Accès refusé : rôle bureau requis', status: 403 };
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
    .select('id, nom, prenom, email, public_token, types_licence, questionnaire_sante_ok, paiement_global, manque_paiement, manque_yeps, licence_ffsu_a_jour, activite_contraintes');

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
    const { sujet, texte, html } = relance
      ? emailRelance(a, statut)
      : emailQrCode(a, statut, `${baseUrl}/adherent/${a.public_token}`);

    try {
      await transporter.sendMail({
        from: `"AS de l'INSA CVL (ne pas répondre)" <${process.env.GMAIL_USER}>`,
        to: a.email,
        subject: sujet,
        text: texte,
        html,
      });
      results.sent++;
    } catch (err) {
      results.errors.push({ nom: `${a.prenom} ${a.nom}`, raison: err.message });
    }
  }

  return res.status(200).json(results);
}
