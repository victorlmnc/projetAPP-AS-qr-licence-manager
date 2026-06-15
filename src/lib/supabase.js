import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const valeursManquantes =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('votre-projet') ||
  supabaseAnonKey.includes('votre-cle');

const erreurConfig = {
  message:
    'Configuration Supabase manquante. Copiez .env.example en .env puis renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
};

function creerClientNonConfigure() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({ data: null, error: erreurConfig }),
      signOut: async () => ({ error: null }),
    },
    from: () => {
      throw new Error(erreurConfig.message);
    },
  };
}

if (valeursManquantes) {
  console.error(erreurConfig.message);
}

export const supabaseConfigMissing = valeursManquantes;

// Client unique réutilisé partout dans l'application.
export const supabase = valeursManquantes
  ? creerClientNonConfigure()
  : createClient(supabaseUrl, supabaseAnonKey);
