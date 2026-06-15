import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Fournit à toute l'application : utilisateur connecté + rôle + déconnexion.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null); // { role, adherent_id, ... }
  const [loading, setLoading] = useState(true);

  // 1) Récupère la session au démarrage et écoute connexion/déconnexion.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setSession(null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2) Quand la session change, charge le profil (rôle) de l'utilisateur.
  useEffect(() => {
    async function loadProfile() {
      if (session === undefined) return;

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role, adherent_id, nom, prenom')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Erreur chargement profil :', error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    setLoading(true);
    loadProfile();
  }, [session]);

  const value = {
    user: session?.user ?? null,
    role: profile?.role ?? null,         // 'bureau' | 'coach' | 'adherent'
    adherentId: profile?.adherent_id ?? null,
    profile,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Raccourci pour consommer le contexte dans n'importe quel composant.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
