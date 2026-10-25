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
  // Profil charge et id de l'utilisateur auquel il correspond.
  const [profilCharge, setProfilCharge] = useState({ userId: null, data: null });

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
  //    On depend de l'id et non de la session : Supabase renouvelle la session
  //    (token rafraichi environ toutes les heures, reconnexion) sans changer
  //    d'utilisateur, et recharger le profil demonterait la page en cours.
  const sessionChargee = session !== undefined;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let actif = true;

    async function loadProfile() {
      let data = null;

      try {
        const resultat = await withTimeout(
          supabase
            .from('profiles')
            .select('role, nom, prenom')
            .eq('id', userId)
            .single(),
          'Profil Supabase'
        );

        if (resultat.error) {
          console.error('Erreur chargement profil :', resultat.error.message);
        } else {
          data = resultat.data;
        }
      } catch (error) {
        console.error('Profil Supabase impossible a charger :', error.message);
      }

      if (actif) setProfilCharge({ userId, data });
    }

    loadProfile();

    return () => {
      actif = false;
    };
  }, [userId]);

  // Tant que le profil de l'utilisateur courant n'est pas arrive, on est en chargement :
  // evite d'afficher "Aucun role" ou de rediriger pendant une fraction de seconde.
  const profile = userId && profilCharge.userId === userId ? profilCharge.data : null;
  const loading = !sessionChargee || (userId !== null && profilCharge.userId !== userId);

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
