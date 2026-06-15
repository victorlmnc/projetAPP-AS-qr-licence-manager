import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [initialized, setInitialized] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ key: '', login: '', password: '' });
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  async function checkSetupStatus() {
    try {
      const status = await api.getSetupStatus();
      setInitialized(status.initialized);
    } catch (err) {
      console.error('Erreur lors de la verification du statut :', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      await login(loginName, password);
      navigate('/');
    } catch (error) {
      setErreur(error.message || 'Identifiants incorrects.');
    } finally {
      setEnCours(false);
    }
  }

  async function handleSetupSubmit(e) {
    e.preventDefault();
    setSetupError(null);
    setSetupLoading(true);

    if (setupForm.key.length !== 40) {
      setSetupError("La cle d'activation doit faire exactement 40 caracteres.");
      setSetupLoading(false);
      return;
    }

    try {
      await api.initializeSetup(setupForm.key, setupForm.login, setupForm.password);
      alert('Compte administrateur cree et base initialisee avec succes !');
      setShowSetup(false);
      setInitialized(true);
      setLoginName(setupForm.login);
      setSetupForm({ key: '', login: '', password: '' });
    } catch (error) {
      setSetupError(error.message || "Erreur lors de l'initialisation.");
    } finally {
      setSetupLoading(false);
    }
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="Logo AS"
            onError={(e) => (e.target.style.display = 'none')}
            style={{ height: '70px', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
          />
          <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>Contrôle des licences</h1>
          <p className="muted" style={{ margin: 0 }}>Connectez-vous pour continuer.</p>
        </div>

        <label>
          Identifiant
          <input
            type="text"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <button type="submit" disabled={enCours}>
            {enCours ? 'Connexion...' : 'Se connecter'}
          </button>

          {!initialized && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowSetup(true)}
              style={{ color: 'var(--accent)' }}
            >
              Responsable (Initialiser le systeme)
            </button>
          )}
        </div>
      </form>

      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <aside className="editor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <form onSubmit={handleSetupSubmit}>
              <h3>Configuration Responsable</h3>
              <p className="muted small">
                La base de donnees est vide. Saisissez la cle de 40 caracteres pour initialiser le systeme.
              </p>

              <label>
                Cle de securite (40 caracteres)
                <input
                  type="text"
                  maxLength={40}
                  placeholder="Entrez la cle fixe de 40 caracteres..."
                  value={setupForm.key}
                  onChange={(e) => setSetupForm((f) => ({ ...f, key: e.target.value }))}
                  required
                  style={{ fontFamily: 'monospace' }}
                />
                <span className="small muted" style={{ display: 'block', marginTop: '4px' }}>
                  Longueur : {setupForm.key.length}/40 caracteres
                </span>
              </label>

              <hr />

              <label>
                Nouvel Identifiant Admin
                <input
                  type="text"
                  placeholder="Ex: admin"
                  value={setupForm.login}
                  onChange={(e) => setSetupForm((f) => ({ ...f, login: e.target.value }))}
                  required
                />
              </label>

              <label>
                Nouveau Mot de passe Admin
                <input
                  type="password"
                  placeholder="Ex: insa-as-admin"
                  value={setupForm.password}
                  onChange={(e) => setSetupForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </label>

              {setupError && <p className="error">{setupError}</p>}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowSetup(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={setupLoading}>
                  {setupLoading ? 'Initialisation...' : "Activer & Creer l'Admin"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
