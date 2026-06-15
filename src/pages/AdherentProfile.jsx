import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { messageAdherent } from '../lib/licence';
import Header from '../components/Header';

// Le chargement de la fiche personnelle est DÉJÀ prêt.
// ====== À COMPLÉTER — Personne 5 ======
// Afficher le QR Code (QRCodeCanvas value={adherent.id}) et finaliser la PWA
// (icônes du manifest, service worker, bouton "installer").
export default function AdherentProfile() {
  const { adherentId } = useAuth();
  const [adherent, setAdherent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!adherentId) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getAdherent(adherentId);
        setAdherent(data);
      } catch (error) {
        console.error('Failed to load own profile:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [adherentId]);

  return (
    <div className="page">
      <Header titre="Ma licence" />

      <main className="container">
        {loading && <p>Chargement…</p>}

        {!loading && !adherent && (
          <p className="muted">
            Aucune fiche associée à votre compte. Contactez le Bureau.
          </p>
        )}

        {adherent && (
          <>
            <h2>
              {adherent.prenom} {adherent.nom}
            </h2>
            <p>{messageAdherent(adherent)}</p>
            <p className="muted">
              Zone à compléter (Personne 5) : afficher le QR Code et configurer la PWA.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
