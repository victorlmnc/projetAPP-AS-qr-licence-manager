import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!supabaseConfigured) {
        setProfile(null);
        setLoading(false);
        return;
      }

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
    role: profile?.role ?? null,
    adherentId: profile?.adherent_id ?? null,
    profile,
    loading,
    supabaseConfigured,
    signOut: () => supabase?.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans un AuthProvider');
  return ctx;
}
