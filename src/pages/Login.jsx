import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigMissing } from '../lib/supabase';
import { useTitrePage } from '../lib/useTitrePage';

const DOMAINE_LOGIN = 'as-licences.fr';

function versEmail(identifiant) {
  const v = identifiant.trim();
  return v.includes('@') ? v : `${v}@${DOMAINE_LOGIN}`;
}

export default function Login() {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const navigate = useNavigate();
  useTitrePage('Connexion');

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: versEmail(identifiant),
      password,
    });

    setEnCours(false);
    if (error) {
      // 400 = identifiants refusés ; sinon le serveur n'a pas pu être joint.
      setErreur(
        error.status === 400
          ? 'Identifiants incorrects.'
          : 'Connexion impossible pour le moment. Vérifiez votre connexion internet puis réessayez.'
      );
      return;
    }
    navigate('/');
  }

  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <img src="/logo.png" alt="Logo AS" />
          <div>
            <span>AS INSA CVL · Bourges</span>
            <h1>Contrôle des licences</h1>
          </div>
        </div>

        {supabaseConfigMissing && (
          <p className="error">
            Configuration Supabase manquante : créez un fichier .env avec les clés du projet.
          </p>
        )}

        <label>
          Identifiant
          <input
            type="text"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {erreur && <p className="error" role="alert">{erreur}</p>}

        <button type="submit" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
