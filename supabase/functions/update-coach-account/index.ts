import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DOMAIN = 'as-licences.fr';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toEmail(login: string) {
  const clean = normaliserLogin(login);
  if (!clean) return '';
  return `${clean}@${DOMAIN}`;
}

function normaliserLogin(login: string) {
  const clean = login.trim().toLowerCase();
  return clean.includes('@') ? clean.split('@')[0].trim() : clean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Configuration Supabase Edge Function manquante.' }, 500);
  }

  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace('Bearer ', '').trim();
  if (!token) {
    return json({ error: 'Connexion requise.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: 'Session invalide.' }, 401);
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (callerProfile?.role !== 'bureau') {
    return json({ error: 'Acces reserve au Bureau.' }, 403);
  }

  const body = await req.json().catch(() => null);
  const coachId = String(body?.coachId ?? '').trim();
  const login = normaliserLogin(String(body?.login ?? ''));
  const password = String(body?.password ?? '').trim();
  const nom = String(body?.nom ?? '').trim();
  const prenom = String(body?.prenom ?? '').trim();

  if (!coachId || !login) {
    return json({ error: 'Coach et login obligatoires.' }, 400);
  }
  if (!/^[a-z0-9._-]+$/.test(login)) {
    return json({ error: 'Le login peut contenir lettres, chiffres, points, tirets et underscores.' }, 400);
  }
  if (password && password.length < 8) {
    return json({ error: 'Le mot de passe doit faire au moins 8 caracteres.' }, 400);
  }

  const { data: loginExistant, error: loginError } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('login', login)
    .neq('id', coachId)
    .maybeSingle();

  if (loginError) {
    return json({ error: loginError.message }, 400);
  }
  if (loginExistant) {
    return json({ error: 'Ce login est deja utilise par un autre compte.' }, 409);
  }

  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', coachId)
    .single();

  if (targetError || targetProfile?.role !== 'coach') {
    return json({ error: 'Compte coach introuvable.' }, 404);
  }

  const email = toEmail(login);
  const updateAuth: { email: string; email_confirm: boolean; password?: string } = {
    email,
    email_confirm: true,
  };
  if (password) updateAuth.password = password;

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(coachId, updateAuth);
  if (updateAuthError) {
    return json({ error: updateAuthError.message }, 400);
  }

  const { error: updateProfileError } = await adminClient
    .from('profiles')
    .update({ login, nom, prenom })
    .eq('id', coachId);

  if (updateProfileError) {
    return json({ error: updateProfileError.message }, 400);
  }

  return json({ success: true, email });
});
