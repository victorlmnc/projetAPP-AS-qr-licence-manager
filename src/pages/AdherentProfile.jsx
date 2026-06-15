import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
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
      if (!adherentId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('adherents')
        .select('*')
        .eq('id', adherentId)
        .single();

      if (error) {
        setErreur('Impossible de charger votre fiche de licence.');
        setAdherent(null);
        setLoading(false);
        return;
      }

      setAdherent(data);
      setLoading(false);
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
            Aucune fiche associ&eacute;e &agrave; votre compte. Contactez le Bureau.
          </p>
        )}

        {adherent && (
          <section className="profile">
            <div className="profile__intro">
              <h2>{adherent.prenom} {adherent.nom}</h2>
              <p>{messageAdherent(adherent)}</p>
            </div>

            <StatusBanner adherent={adherent} />

            <div className="profile-card">
              <div>
                <h3>Mon QR Code</h3>
                <p className="muted">
                  Pr&eacute;sentez ce code &agrave; votre coach lors des entra&icirc;nements et matchs.
                </p>
              </div>

              <div className="profile-qr" aria-label="QR Code de licence">
                <QRCodeCanvas value={adherent.id} size={220} />
              </div>

              <p className="qr-id">id : {adherent.id}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
