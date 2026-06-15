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

  if (action === 'password') {
    return <ChangePasswordModal onClose={() => setAction(null)} />;
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
        <h3>Parametres</h3>

        <div className="settings-actions">
          <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password')}>
            <span className="settings-action__title">Modifier mon mot de passe</span>
            <span className="settings-action__text">Changer le mot de passe du compte connecte.</span>
          </button>

          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action settings-action--danger" onClick={() => setAction('reset')}>
              <span className="settings-action__title">Reinitialiser les adherents</span>
              <span className="settings-action__text">Supprimer toutes les fiches adherents apres confirmation.</span>
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
