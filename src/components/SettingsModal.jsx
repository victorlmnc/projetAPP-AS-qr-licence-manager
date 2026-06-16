import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeCoachPasswordModal from './ChangeCoachPasswordModal';
import ResetAdherentsModal from './ResetAdherentsModal';
import TutorialModal from './TutorialModal';

export default function SettingsModal({ onClose }) {
  const { role } = useAuth();
  const [action, setAction] = useState(null);

  function handleResetCompleted() {
    window.dispatchEvent(new CustomEvent('adherents:reset'));
  }

  // Sous-modals
  if (action === 'password-self') {
    return <ChangePasswordModal target="self" onClose={() => setAction(null)} />;
  }

  if (action === 'password-coach') {
    return <ChangePasswordModal target="coach" onClose={() => setAction(null)} />;
  }

  if (action === 'coach-password') {
    return <ChangeCoachPasswordModal onClose={() => setAction(null)} />;
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
          {/* Bureau uniquement : modifier son propre mot de passe */}
          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-self')}>
              <span className="settings-action__title">🔑 Modifier mon mot de passe</span>
              <span className="settings-action__text">Changer le mot de passe du compte bureau.</span>
            </button>
          )}

          {/* Bureau uniquement : modifier le mdp d'un coach */}
          {role === 'bureau' && (
            <button type="button" className="btn-ghost settings-action" onClick={() => setAction('password-coach')}>
              <span className="settings-action__title">👤 Modifier le mot de passe d'un coach</span>
              <span className="settings-action__text">Réinitialiser le mot de passe d'un compte coach.</span>
            </button>
          )}

          {/* Bureau uniquement : réinitialiser les adhérents */}
          {role === 'bureau' && (
            <>
              <button type="button" className="btn-ghost settings-action" onClick={() => setAction('coach-password')}>
                <span className="settings-action__title">Modifier le mot de passe coach</span>
                <span className="settings-action__text">Choisir un compte coach et définir son nouveau mot de passe.</span>
              </button>

              <button type="button" className="btn-ghost settings-action settings-action--danger" onClick={() => setAction('reset')}>
                <span className="settings-action__title">Réinitialiser les adhérents</span>
                <span className="settings-action__text">Supprimer toutes les fiches adhérents après confirmation.</span>
              </button>
            </>
          )}

          {/* Accessible à tous : tutoriel */}
          <button type="button" className="btn-ghost settings-action" onClick={() => setAction('tutorial')}>
            <span className="settings-action__title">📖 Tutoriel / Aide</span>
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
