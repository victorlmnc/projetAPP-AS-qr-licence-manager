import { useState } from 'react';
import { api } from '../lib/api';

export default function ChangePasswordModal({ onClose }) {
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState(null);
  const [ok, setOk] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);

    if (mdp.length < 8) {
      setErreur('Le mot de passe doit faire au moins 8 caracteres.');
      return;
    }
    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    try {
      await api.updatePassword(mdp);
      setOk(true);
      setMdp('');
      setConfirme('');
    } catch (error) {
      setErreur('Modification impossible : ' + error.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Changer mon mot de passe</h3>

        {ok ? (
          <>
            <p className="apercu apercu--ok">Mot de passe modifie.</p>
            <div className="modal-actions">
              <button onClick={onClose}>Fermer</button>
            </div>
          </>
        ) : (
          <form onSubmit={valider}>
            <label className="champ">
              Nouveau mot de passe
              <input
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="champ">
              Confirmer le mot de passe
              <input
                type="password"
                value={confirme}
                onChange={(e) => setConfirme(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {erreur && <p className="error">{erreur}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" disabled={enCours}>
                {enCours ? 'Modification...' : 'Valider'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
