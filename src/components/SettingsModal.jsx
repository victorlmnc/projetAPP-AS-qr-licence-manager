import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import ResetAdherentsModal from './ResetAdherentsModal';
import TutorialModal from './TutorialModal';

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

  if (action === 'tutorial') {
    return <TutorialModal onClose={() => setAction(null)} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Paramètres</h3>

        <div className="settings-actions">
          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-self')}>
              <span className="settings-action__title">Modifier mon mot de passe</span>
              <span className="settings-action__text">Changer le mot de passe du compte bureau.</span>
            </button>
          )}

          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-coach')}>
              <span className="settings-action__title">Modifier le mot de passe des respos sports</span>
              <span className="settings-action__text">Modifier le mot de passe du compte respos sports partagé.</span>
            </button>
          )}

          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action settings-action--danger" onClick={() => setAction('reset')}>
              <span className="settings-action__title">Réinitialiser les adhérents</span>
              <span className="settings-action__text">Supprimer toutes les fiches adhérents après confirmation.</span>
            </button>
          )}

          <button type="button" className="btn-ghost settings-action" onClick={() => setAction('tutorial')}>
            <span className="settings-action__title">Tutoriel / Aide</span>
            <span className="settings-action__text">Découvrir comment utiliser l'application.</span>
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
