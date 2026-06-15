import { useState } from 'react';
import { initializeAdmin } from '../lib/initApi';

// Modale d'initialisation du premier compte administrateur.
// Demande une clé secrète de 40 caractères, un identifiant et un mot de passe.
export default function InitAdminModal({ onClose, onSuccess }) {
  const [cle, setCle] = useState('');
  const [identifiant, setIdentifiant] = useState('');
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [ok, setOk] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);

    // Validations locales
    if (cle.length !== 40) {
      setErreur('La clé secrète doit contenir exactement 40 caractères.');
      return;
    }

    if (!identifiant.trim()) {
      setErreur("L'identifiant est requis.");
      return;
    }

    if (mdp.length < 8) {
      setErreur('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }

    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    try {
      await initializeAdmin(cle, identifiant, mdp);
      setOk(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>🔐 Initier compte administrateur</h3>

        {ok ? (
          <>
            <p className="apercu apercu--ok">
              Compte administrateur créé avec succès ! Vous pouvez maintenant vous connecter.
            </p>
            <div className="modal-actions">
              <button onClick={onClose}>Fermer</button>
            </div>
          </>
        ) : (
          <form onSubmit={valider}>
            <p className="muted" style={{ textAlign: 'left', marginTop: 0 }}>
              Aucun compte administrateur n'existe. Renseignez la clé secrète
              d'installation et créez le premier compte.
            </p>

            <label className="champ">
              Clé secrète (40 caractères)
              <input
                type="password"
                value={cle}
                onChange={(e) => setCle(e.target.value)}
                placeholder="Entrez la clé de 40 caractères"
                maxLength={40}
                autoComplete="off"
              />
              <span className="muted small" style={{ fontWeight: 400 }}>
                {cle.length}/40 caractères
              </span>
            </label>

            <label className="champ">
              Identifiant administrateur
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="ex. bureau"
                autoComplete="username"
                required
              />
            </label>

            <label className="champ">
              Mot de passe
              <input
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="champ">
              Confirmer le mot de passe
              <input
                type="password"
                value={confirme}
                onChange={(e) => setConfirme(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {erreur && <p className="error">{erreur}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" disabled={enCours}>
                {enCours ? 'Création en cours…' : 'Créer le compte admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
