import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TutorialModal from './TutorialModal';

// Protège une route.
//   allow : liste des rôles autorisés, ex. ['bureau']. Si absent, toute
//           personne connectée est acceptée.
export default function ProtectedRoute({ allow, children }) {
  const { user, role, loading } = useAuth();

  const [tutoOuvert, setTutoOuvert] = useState(false);

  if (loading) return <p className="centered">Chargement…</p>;

  // Pas connecté -> page de connexion.
  if (!user) return <Navigate to="/login" replace />;

  // Connecté mais rôle non autorisé -> renvoyé vers son accueil.
  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {children}
      <button 
        className="btn-tuto-float" 
        onClick={() => setTutoOuvert(true)}
        aria-label="Tutoriel"
        title="Ouvrir le tutoriel"
      >
        Tuto
      </button>
      {tutoOuvert && <TutorialModal onClose={() => setTutoOuvert(false)} />}
    </>
  );
}
