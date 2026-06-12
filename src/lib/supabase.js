import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Clés Supabase manquantes. Copiez .env.example en .env et renseignez vos valeurs."
  );
}

// Client unique réutilisé partout dans l'application.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
