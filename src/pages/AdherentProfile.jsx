import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { messageAdherent } from '../lib/licence';
import Header from '../components/Header';
import StatusBanner from '../components/StatusBanner';

export default function AdherentProfile() {
  const { adherentId } = useAuth();
  const [adherent, setAdherent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function load() {
      setErreur(null);

      if (!adherentId) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getAdherent(adherentId);
        setAdherent(data);
      } catch {
        setErreur('Chargement de la licence impossible.');
        setAdherent(null);
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
        {loading && <p>Chargement...</p>}

        {erreur && <p className="error">{erreur}</p>}

        {!loading && !erreur && !adherent && (
          <p className="muted">
            Aucune fiche associee a votre compte. Contactez le Bureau.
          </p>
        )}

        {adherent && (
          <article className="profile-panel">
            <div className="profile-heading">
              <div>
                <h2>
                  {adherent.prenom} {adherent.nom}
                </h2>
                <p>{messageAdherent(adherent)}</p>
              </div>
            </div>

            <StatusBanner adherent={adherent} />

            <section className="profile-qr" aria-label="QR Code de licence">
              <div className="profile-qr-card">
                <QRCodeCanvas value={adherent.id} size={220} />
              </div>
              <p className="muted small">
                Presentez ce QR Code au responsable sportif lors du controle terrain.
              </p>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
