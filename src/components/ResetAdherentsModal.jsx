import { useState } from 'react';
import { resetAdherents } from '../lib/initApi';

// Modale de réinitialisation de tous les adhérents.
// Demande la clé secrète de 40 caractères pour confirmer.
// Après succès, appelle onReset() pour vider la liste côté state.
export default function ResetAdherentsModal({ onClose, onReset }) {
  const [cle, setCle] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);

  async function confirmer(e) {
    e.preventDefault();
    setErreur(null);

    if (cle.length !== 40) {
      setErreur('La clé secrète doit contenir exactement 40 caractères.');
      return;
    }

    setEnCours(true);
    try {
      const data = await resetAdherents(cle);
      setResultat(data);
      if (onReset) onReset();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>⚠️ Réinitialiser les comptes adhérents</h3>

        {resultat ? (
          <>
            <p className="apercu apercu--ok">
              Réinitialisation terminée.
              <br />
              {resultat.deleted_adherents} adhérent{resultat.deleted_adherents > 1 ? 's' : ''} supprimé{resultat.deleted_adherents > 1 ? 's' : ''}.
              <br />
              {resultat.deleted_profiles} profil{resultat.deleted_profiles > 1 ? 's' : ''} adhérent{resultat.deleted_profiles > 1 ? 's' : ''} supprimé{resultat.deleted_profiles > 1 ? 's' : ''}.
            </p>
            <div className="modal-actions">
              <button onClick={onClose}>Fermer</button>
            </div>
          </>
        ) : (
          <form onSubmit={confirmer}>
            <div
              className="apercu apercu--ko"
              style={{ textAlign: 'left' }}
            >
              <strong>Attention !</strong> Cette action supprimera <strong>TOUS</strong> les
              adhérents de la base de données ainsi que leurs profils de connexion.
              <br />
              <strong>Cette action est irréversible.</strong>
              <br /><br />
              Les comptes administrateur (bureau) et coach ne seront pas affectés.
            </div>

            <label className="champ">
              Clé secrète (40 caractères)
              <input
                type="password"
                value={cle}
                onChange={(e) => setCle(e.target.value)}
                placeholder="Entrez la clé de 40 caractères pour confirmer"
                maxLength={40}
                autoComplete="off"
              />
              <span className="muted small" style={{ fontWeight: 400 }}>
                {cle.length}/40 caractères
              </span>
            </label>

            {erreur && <p className="error">{erreur}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <button
                type="submit"
                className="btn-danger"
                disabled={enCours}
              >
                {enCours ? 'Suppression…' : 'Confirmer la réinitialisation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
