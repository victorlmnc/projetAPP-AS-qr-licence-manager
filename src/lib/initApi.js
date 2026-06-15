import { supabase } from './supabase';

// ============================================================
// API d'initialisation et de réinitialisation.
//
// Toute la vérification de la clé secrète se fait côté serveur
// (fonctions PostgreSQL security definer). Le frontend ne fait
// que transmettre la clé en clair via RPC — Supabase chiffre
// la connexion en HTTPS.
// ============================================================

// Domaine interne pour les identifiants courts.
const DOMAINE_LOGIN = 'as-licences.fr';

function versEmail(identifiant) {
  const v = identifiant.trim();
  return v.includes('@') ? v : `${v}@${DOMAINE_LOGIN}`;
}

// Vérifie si le système est déjà initialisé (un admin existe).
export async function checkInitialized() {
  const { data, error } = await supabase.rpc('check_initialized');
  if (error) {
    console.error('Erreur check_initialized :', error.message);
    return false; // En cas d'erreur, on considère non initialisé
  }
  return data === true;
}

// Crée le premier compte administrateur.
// 1) Crée le user dans Supabase Auth via signUp
// 2) Appelle la RPC initialize_admin pour créer le profil bureau
export async function initializeAdmin(key, identifiant, password) {
  // Étape 1 : Créer le compte utilisateur
  const email = versEmail(identifiant);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    throw new Error('Erreur création du compte : ' + signUpError.message);
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error('Erreur inattendue : aucun utilisateur créé.');
  }

  // Étape 2 : Initialiser le profil admin via RPC sécurisée
  const { error: rpcError } = await supabase.rpc('initialize_admin', {
    p_key: key,
    p_user_id: userId,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Étape 3 : Se connecter automatiquement avec le nouveau compte
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // Le compte est créé mais la connexion auto a échoué.
    // L'utilisateur pourra se connecter manuellement.
    console.warn('Connexion automatique échouée :', signInError.message);
  }

  return { email, userId };
}

// Supprime tous les adhérents et leurs profils.
// L'appelant doit être connecté en tant que bureau.
export async function resetAdherents(key) {
  const { data, error } = await supabase.rpc('reset_adherents', {
    p_key: key,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; // { deleted_adherents, deleted_profiles }
}
