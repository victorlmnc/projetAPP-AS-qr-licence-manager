import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CONFIRMATION = 'SUPPRIMER';

export default function ResetAdherentsModal({ onClose, onResetCompleted }) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);

    if (confirmation.trim() !== CONFIRMATION) {
      setErreur(`Tapez ${CONFIRMATION} pour confirmer.`);
      return;
    }

    if (!user || !user.email) {
      setErreur("Impossible de verifier l'utilisateur connecte.");
      return;
    }

    setEnCours(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        setErreur('Mot de passe incorrect.');
        setEnCours(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('adherents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        setErreur('Erreur lors de la suppression : ' + deleteError.message);
        setEnCours(false);
        return;
      }

      onResetCompleted();
      onClose();
    } catch (err) {
      setErreur('Une erreur inattendue est survenue : ' + err.message);
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal danger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon" aria-hidden="true">!</div>
        <h3>Reinitialiser les adherents</h3>
        <p className="danger-copy">
          Cette action supprime toutes les fiches adherents. Elle est definitive apres
          confirmation du mot de passe bureau.
        </p>

        <form onSubmit={valider}>
          <label className="champ">
            Mot de passe du compte bureau
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe actuel"
              required
              autoFocus
            />
          </label>

          <label className="champ">
            Tapez SUPPRIMER
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="SUPPRIMER"
              required
            />
          </label>

          {erreur && <p className="error">{erreur}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={enCours}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={enCours || confirmation.trim() !== CONFIRMATION}
            >
              {enCours ? 'Reinitialisation...' : 'Supprimer toutes les fiches'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
