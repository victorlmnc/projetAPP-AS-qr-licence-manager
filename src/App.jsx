import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import BureauDashboard from './pages/BureauDashboard';
import CoachScan from './pages/CoachScan';
import AdherentProfile from './pages/AdherentProfile';

function Home() {
  const { user, role, loading, supabaseConfigured } = useAuth();

  if (loading) return <p className="centered">Chargement...</p>;

  if (!supabaseConfigured) {
    return (
      <main className="container">
        <div className="config-warning">
          <h1>Configuration Supabase manquante</h1>
          <p>
            Creez un fichier <code>.env</code> a la racine du projet avec :
          </p>
          <pre>{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}</pre>
          <p className="muted">
            Ensuite, relancez le serveur avec <code>npm run dev</code>.
          </p>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === 'bureau') return <Navigate to="/bureau" replace />;
  if (role === 'coach') return <Navigate to="/scan" replace />;
  if (role === 'adherent') return <Navigate to="/profil" replace />;

  return (
    <p className="centered">
      Aucun role attribue a ce compte. Contactez le Bureau.
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
