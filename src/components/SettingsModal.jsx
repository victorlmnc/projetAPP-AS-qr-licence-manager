import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import ResetAdherentsModal from './ResetAdherentsModal';

export default function SettingsModal({ onClose }) {
  const { role } = useAuth();
  const [action, setAction] = useState(null);

  function handleResetCompleted() {
    window.dispatchEvent(new CustomEvent('adherents:reset'));
  }

  if (action === 'password-self') {
    return <ChangePasswordModal target="self" onClose={() => setAction(null)} />;
  }

  if (action === 'password-coach') {
    return <ChangePasswordModal target="coach" onClose={() => setAction(null)} />;
  }

  if (action === 'reset') {
    return (
      <ResetAdherentsModal
        onClose={() => setAction(null)}
        onResetCompleted={handleResetCompleted}
      />
    );
  }


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Paramètres</h3>

        <div className="settings-actions">
          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-self')}>
              <span className="settings-action__title">Modifier le mot de passe du compte bureau</span>
            </button>
          )}

          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-coach')}>
              <span className="settings-action__title">Modifier le mot de passe de respos-sports</span>
            </button>
          )}

          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action settings-action--danger" onClick={() => setAction('reset')}>
              <span className="settings-action__title">Réinitialiser la base de données.</span>
              <span className="settings-action__text">Supprimer toutes les fiches des adhérents.</span>
            </button>
          )}


        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
