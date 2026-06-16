import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- Validation mdp côté serveur (même règles que le client) ----------

const MOTS_INTERDITS = [
  'as', 'insa', 'cvl', 'bureau', 'coach', 'login', 'licence',
  'password', 'motdepasse', '2024', '2025', '2026', '2027',
];

function validerMotDePasse(mdp) {
  const v = mdp ?? '';
  const lower = v.toLowerCase();
  const echecs = [];

  if (v.length < 8) echecs.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(v)) echecs.push('Au moins 1 majuscule');
  if (!/[a-z]/.test(v)) echecs.push('Au moins 1 minuscule');
  if (!/[0-9]/.test(v)) echecs.push('Au moins 1 chiffre');
  if (!/[^A-Za-z0-9]/.test(v)) echecs.push('Au moins 1 caractère spécial');
  if (MOTS_INTERDITS.some((mot) => lower.includes(mot))) {
    echecs.push('Ne doit pas contenir de mots courants (as, insa, bureau…)');
  }

  return echecs.length > 0 ? echecs : null;
}

// ---------- Auth : vérifier que l'appelant est bureau ----------

async function requireBureau(req) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { error: 'Non authentifie', status: 401 };

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Token invalide', status: 401 };

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

// ---------- Handler ----------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1) Vérifier que l'appelant est bureau
  const auth = await requireBureau(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { targetUserId, newPassword } = req.body ?? {};

  if (!targetUserId || !newPassword) {
    return res.status(400).json({ error: 'targetUserId et newPassword requis.' });
  }

  // 2) Valider le mot de passe côté serveur
  const echecs = validerMotDePasse(newPassword);
  if (echecs) {
    return res.status(400).json({ error: 'Mot de passe invalide.', details: echecs });
  }

  // 3) Vérifier que la cible est bien un coach
  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single();

  if (profileError || !targetProfile) {
    return res.status(404).json({ error: 'Utilisateur cible introuvable.' });
  }

  if (targetProfile.role !== 'coach') {
    return res.status(403).json({ error: 'Vous ne pouvez modifier que le mot de passe d\'un coach.' });
  }

  // 4) Changer le mot de passe via l'admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  );

  if (updateError) {
    return res.status(500).json({ error: 'Modification impossible : ' + updateError.message });
  }

  return res.status(200).json({ ok: true });
}
