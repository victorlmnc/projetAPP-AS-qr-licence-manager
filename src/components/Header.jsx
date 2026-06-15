import { useAuth } from '../context/AuthContext';
import InstallButton from './InstallButton';

export default function Header({ titre }) {
  const { role, signOut } = useAuth();

  return (
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
          <span>AS INSA</span>
          <strong>{titre}</strong>
        </div>
        {role && <span className="badge">{role}</span>}
      </div>
      <div className="topbar__actions">
        <InstallButton />
        <button className="btn-ghost" onClick={signOut}>Se deconnecter</button>
      </div>
    </header>
  );
}
