import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigMissing } from '../lib/supabase';
import { checkInitialized } from '../lib/initApi';
import InitAdminModal from '../components/InitAdminModal';

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

  // État d'initialisation du système
  const [initialized, setInitialized] = useState(null); // null = chargement
  const [initModalOuvert, setInitModalOuvert] = useState(false);

  // Au montage, vérifier si le système est initialisé.
  useEffect(() => {
    if (supabaseConfigMissing) {
      setInitialized(true); // pas de config = on n'affiche pas le bouton init
      return;
    }
    checkInitialized().then(setInitialized);
  }, []);

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

  function handleInitSuccess() {
    setInitialized(true);
    setInitModalOuvert(false);
    // Recharger la page pour prendre en compte la session
    window.location.href = '/';
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

        {/* Bouton d'initialisation affiché uniquement si le système n'est pas initialisé */}
        {initialized === false && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '8px 0' }} />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setInitModalOuvert(true)}
              style={{ width: '100%' }}
            >
              🔐 Initier compte administrateur
            </button>
          </>
        )}
      </form>

      {initModalOuvert && (
        <InitAdminModal
          onClose={() => setInitModalOuvert(false)}
          onSuccess={handleInitSuccess}
        />
      )}
    </main>
  );
}
