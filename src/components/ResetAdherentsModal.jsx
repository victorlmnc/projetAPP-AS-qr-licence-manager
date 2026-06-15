import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ResetAdherentsModal({ onClose, onResetCompleted }) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    if (!user || !user.email) {
      setErreur("Erreur : Impossible de vérifier l'utilisateur connecté.");
      setEnCours(false);
      return;
    }

    try {
      // 1) Vérifier le mot de passe en ré-authentifiant l'admin
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        setErreur('Mot de passe incorrect.');
        setEnCours(false);
        return;
      }

      // 2) Supprimer tous les adhérents de la base de données
      const { error: deleteError } = await supabase
        .from('adherents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        setErreur('Erreur lors de la suppression : ' + deleteError.message);
        setEnCours(false);
        return;
      }

      // 3) Succès
      onResetCompleted();
      onClose();
    } catch (err) {
      setErreur("Une erreur inattendue est survenue : " + err.message);
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: 'var(--ko)' }}>Confirmer la réinitialisation</h3>
        <p className="muted small" style={{ marginBottom: '16px' }}>
          Attention : cette action est <strong>définitive</strong> et <strong>irréversible</strong>.
          Elle va supprimer tous les adhérents enregistrés dans l'application.
        </p>

        <form onSubmit={valider}>
          <label className="champ">
            Saisissez votre mot de passe pour confirmer
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe actuel..."
              required
              autoFocus
            />
          </label>

          {erreur && <p className="error" style={{ marginTop: '10px' }}>{erreur}</p>}

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={enCours}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={enCours}
              style={{ backgroundColor: 'var(--ko)', color: 'white' }}
            >
              {enCours ? 'Réinitialisation…' : 'Confirmer la suppression'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
