import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const SUPABASE_TIMEOUT_MS = 8000;

function withTimeout(promise, label) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} trop long a charger`)),
      SUPABASE_TIMEOUT_MS
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

// Fournit a toute l'application : utilisateur connecte + role + deconnexion.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null); // { role, nom, prenom }
  const [loading, setLoading] = useState(true);

  // 1) Recupere la session au demarrage et ecoute connexion/deconnexion.
  useEffect(() => {
    let actif = true;

    async function initSession() {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          'Session Supabase'
        );
        if (actif) setSession(data?.session ?? null);
      } catch (error) {
        console.error('Session Supabase impossible a charger :', error.message);
        if (actif) setSession(null);
      }
    }

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => {
      actif = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // 2) Quand l'utilisateur change, charge son profil (role).
  useEffect(() => {
    let actif = true;

    async function loadProfile() {
      if (session === undefined) return;

      if (!session?.user) {
        if (!actif) return;
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await withTimeout(
          supabase
            .from('profiles')
            .select('role, nom, prenom')
            .eq('id', session.user.id)
            .single(),
          'Profil Supabase'
        );

        if (!actif) return;

        if (error) {
          console.error('Erreur chargement profil :', error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        if (!actif) return;
        console.error('Profil Supabase impossible a charger :', error.message);
        setProfile(null);
      } finally {
        if (actif) setLoading(false);
      }
    }

    loadProfile();
  }, [session]);

  const value = {
    user: session?.user ?? null,
    role: profile?.role ?? null, // 'bureau' | 'coach'
    profile,
    loading,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Raccourci pour consommer le contexte dans n'importe quel composant.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans un AuthProvider');
  return ctx;
}
