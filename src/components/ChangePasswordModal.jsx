import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Permet à l'utilisateur connecté (le bureau) de changer son mot de passe.
// updateUser met à jour le compte courant : pas besoin de redonner l'ancien.
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
      setErreur('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnCours(false);

    if (error) {
      setErreur('Modification impossible : ' + error.message);
      return;
    }
    setOk(true);
    setMdp('');
    setConfirme('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Changer mon mot de passe</h3>

        {ok ? (
          <>
            <p className="apercu apercu--ok">Mot de passe modifié.</p>
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
                {enCours ? 'Modification…' : 'Valider'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
