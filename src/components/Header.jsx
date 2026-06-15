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
          onError={(e) => (e.target.style.display = 'none')}
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
