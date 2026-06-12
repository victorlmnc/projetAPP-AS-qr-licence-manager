import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protège une route.
//   allow : liste des rôles autorisés, ex. ['bureau']. Si absent, toute
//           personne connectée est acceptée.
export default function ProtectedRoute({ allow, children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <p className="centered">Chargement…</p>;

  // Pas connecté -> page de connexion.
  if (!user) return <Navigate to="/login" replace />;

  // Connecté mais rôle non autorisé -> renvoyé vers son accueil.
  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
