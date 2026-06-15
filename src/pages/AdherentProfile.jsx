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
      setErreur(null);

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
        setErreur('Chargement de la licence impossible.');
        setAdherent(null);
      } else {
        setAdherent(data);
      }
      setLoading(false);
    }
    load();
  }, [adherentId]);

  // S'abonner aux changements en temps réel de la licence de l'adhérent
  useEffect(() => {
    if (!adherentId) return;

    const canal = supabase
      .channel('adherent_profile_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adherents' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.id === adherentId) {
            setAdherent(payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old.id === adherentId) {
            setAdherent(null);
            setErreur('Votre licence a été supprimée. Contactez le Bureau.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [adherentId]);

  return (
    <div className="page">
      <Header titre="Ma licence" />

      <main className="container">
        {loading && <p>Chargement…</p>}

        {erreur && <p className="error">{erreur}</p>}

        {!loading && !erreur && !adherent && (
          <p className="muted">
            Aucune fiche associée à votre compte. Contactez le Bureau.
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
                Présentez ce QR Code au responsable sportif lors du contrôle terrain.
              </p>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
