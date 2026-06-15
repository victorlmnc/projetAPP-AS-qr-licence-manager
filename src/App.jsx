import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import BureauDashboard from './pages/BureauDashboard';
import CoachScan from './pages/CoachScan';
import AdherentProfile from './pages/AdherentProfile';
import AdherentPublic from './pages/AdherentPublic';

// Page "/" : envoie chacun vers l'écran de son rôle.
function Home() {
  const { user, role, loading } = useAuth();

  if (loading) return <p className="centered">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (role === 'bureau') return <Navigate to="/bureau" replace />;
  if (role === 'coach') return <Navigate to="/scan" replace />;
  if (role === 'adherent') return <Navigate to="/profil" replace />;

  return (
    <p className="centered">
      Aucun rôle attribué à ce compte. Contactez le Bureau.
    </p>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />

          <Route
            path="/bureau"
            element={
              <ProtectedRoute allow={['bureau']}>
                <BureauDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute allow={['coach']}>
                <CoachScan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <ProtectedRoute allow={['adherent']}>
                <AdherentProfile />
              </ProtectedRoute>
            }
          />

          {/* Page publique : QR code + statut, sans login requis */}
          <Route path="/adherent/:id" element={<AdherentPublic />} />

          {/* Toute URL inconnue retombe sur l'accueil. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
