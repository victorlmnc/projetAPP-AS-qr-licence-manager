import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigMissing } from '../lib/supabase';

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
      setErreur('Identifiants incorrects.');
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
            <span>AS INSA</span>
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

        {erreur && <p className="error">{erreur}</p>}

        <button type="submit" disabled={enCours}>
          {enCours ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
