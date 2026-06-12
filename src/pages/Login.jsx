import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Connexion par email + mot de passe.
// Après succès, on redirige vers "/" qui oriente selon le rôle.
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

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

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
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
