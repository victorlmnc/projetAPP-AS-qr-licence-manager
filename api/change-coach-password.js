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

async function requireBureau(req, supabase) {
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

  try {
    const supabase = getServerSupabase();
    const auth = await requireBureau(req, supabase);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { coachId, password } = req.body ?? {};
    const cleanCoachId = String(coachId ?? '').trim();
    const cleanPassword = String(password ?? '');

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanCoachId)) {
      return res.status(400).json({ error: 'Coach invalide.' });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caracteres.' });
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', cleanCoachId)
      .single();

    if (targetError || targetProfile?.role !== 'coach') {
      return res.status(404).json({ error: 'Compte coach introuvable.' });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(cleanCoachId, {
      password: cleanPassword,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Modification impossible : ' + updateError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
