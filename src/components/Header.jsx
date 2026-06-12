import { useAuth } from '../context/AuthContext';

// Barre du haut réutilisée par chaque écran.
export default function Header({ titre }) {
  const { role, signOut } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <strong>{titre}</strong>
        {role && <span className="badge">{role}</span>}
      </div>
      <button className="btn-ghost" onClick={signOut}>Se déconnecter</button>
    </header>
  );
}
