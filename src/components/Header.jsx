import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import InstallButton from './InstallButton';
import SettingsModal from './SettingsModal';

export default function Header({ titre }) {
  const { role, signOut } = useAuth();
  const [parametresOuverts, setParametresOuverts] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <img
            src="/logo.png"
            className="topbar__logo"
            alt="Logo AS"
            onError={(e) => {
              const retries = Number(e.target.dataset.retries || 0);
              if (retries < 2) {
                e.target.dataset.retries = retries + 1;
                e.target.src = `/logo.png?v=${Date.now()}`;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
          <div className="topbar__title">
            <span>AS INSA CVL - Bourges</span>
            <strong>{titre}</strong>
          </div>
          {role && <span className="badge">{role === 'coach' ? 'Responsable Sport' : role}</span>}
        </div>

        <div className="topbar__actions">
          <InstallButton />
          {role === 'bureau' && (
            <button
              className="btn-ghost"
              onClick={() => setParametresOuverts(true)}
              aria-label="Paramètres"
              title="Paramètres"
            >
              {'\u2699'} Paramètres
            </button>
          )}
          <button className="btn-ghost" onClick={signOut}>Se déconnecter</button>
        </div>
      </header>

      {parametresOuverts && (
        <SettingsModal onClose={() => setParametresOuverts(false)} />
      )}
    </>
  );
}
