import { useAuth } from '../context/AuthContext';
import InstallButton from './InstallButton';

// Barre du haut réutilisée par chaque écran.
export default function Header({ titre }) {
  const { role, signOut } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <strong>{titre}</strong>
        {role && <span className="badge">{role}</span>}
      </div>
      <div className="topbar__actions">
        <InstallButton />
        <button className="btn-ghost" onClick={signOut}>Se déconnecter</button>
      </div>
    </header>
  );
}
