import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { SelecteurDonnees } from './dev/SelecteurDonnees';

// Chaque espace est chargé à la demande : la page publique et le scan
// sur téléphone ne téléchargent pas le code du tableau de bord.
const BureauDashboard = lazy(() => import('./pages/BureauDashboard'));
const CoachScan = lazy(() => import('./pages/CoachScan'));
const AdherentPublic = lazy(() => import('./pages/AdherentPublic'));

// Page "/" : envoie chacun vers l'écran de son rôle.
function Home() {
  const { user, role, loading } = useAuth();

  if (loading) return <p className="centered">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (role === 'bureau') return <Navigate to="/bureau" replace />;
  if (role === 'coach') return <Navigate to="/scan" replace />;

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
        <Suspense fallback={<p className="centered">Chargement…</p>}>
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
            {/* Page publique : QR code + statut, sans login requis */}
            <Route path="/adherent/:token" element={<AdherentPublic />} />

            {/* Développement uniquement : pages avec données de test, sans connexion
                (break-ui). Absentes du build de production. */}
            {import.meta.env.DEV && (
              <>
                <Route path="/dev/bureau" element={<><BureauDashboard /><SelecteurDonnees /></>} />
                <Route path="/dev/scan" element={<><CoachScan /><SelecteurDonnees /></>} />
                <Route path="/dev/adherent" element={<><AdherentPublic /><SelecteurDonnees /></>} />
              </>
            )}

            {/* Toute URL inconnue retombe sur l'accueil. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
