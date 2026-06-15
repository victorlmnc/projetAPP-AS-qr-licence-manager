import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigMissing } from '../lib/supabase';

// Domaine interne ajouté automatiquement aux identifiants courts.
// Les comptes doivent être créés avec ces e-mails : par ex. "bureau@as-licences.fr"
// et "coach@as-licences.fr". L'utilisateur tape alors juste "bureau" ou "coach".
const DOMAINE_LOGIN = 'as-licences.fr';

// Transforme l'identifiant saisi en e-mail pour Supabase.
// Si l'utilisateur tape déjà une adresse complète (avec @), on la garde telle quelle.
function versEmail(identifiant) {
  const v = identifiant.trim();
  return v.includes('@') ? v : `${v}@${DOMAINE_LOGIN}`;
}

// Connexion par identifiant + mot de passe.
// Après succès, on redirige vers "/" qui oriente selon le rôle.
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
      <form className="card" onSubmit={handleSubmit}>
        <h1>Contrôle des licences</h1>
        <p className="muted">Connectez-vous pour continuer.</p>

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
            placeholder="ex. bureau"
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
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
