import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(req.query.token || '').trim();
  if (!/^[0-9a-f-]{32,80}$/i.test(token)) {
    return res.status(400).json({ error: 'QR Code invalide.' });
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('adherents')
      .select('public_token, nom, prenom, questionnaire_sante_ok, paiement_global, manque_paiement, manque_yeps, manque_passport')
      .eq('public_token', token)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Erreur de lecture.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Aucun adherent trouve pour ce QR Code.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
