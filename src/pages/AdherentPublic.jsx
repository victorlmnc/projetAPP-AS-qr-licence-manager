import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet, reparerTexte } from '../lib/texte';
import StatusBanner from '../components/StatusBanner';

export default function AdherentPublic() {
  const { id } = useParams();
  const [adherent, setAdherent] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('adherents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setErreur('Aucun adhérent trouvé pour ce QR Code.');
      } else {
        setAdherent(data);
      }
      setChargement(false);
    }
    charger();
  }, [id]);

  function telechargerQr() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const lien = document.createElement('a');
    lien.href = canvas.toDataURL('image/png');
    lien.download = `qr-licence-${reparerTexte(adherent.nom)}-${reparerTexte(adherent.prenom)}.png`;
    lien.click();
  }

  if (chargement) {
    return (
      <div className="pub-page">
        <p className="centered">Chargement…</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="pub-page">
        <div className="pub-card">
          <p className="error" style={{ textAlign: 'center', padding: '24px' }}>{erreur}</p>
        </div>
      </div>
    );
  }

  const { valide } = calculerStatutLicence(adherent);

  return (
    <div className="pub-page">
      <div className="pub-card">
        <div className="pub-header">
          <img src="/logo.png" alt="Logo AS" className="pub-logo" />
          <div>
            <h2 className="pub-name">{nomComplet(adherent)}</h2>
            <p className="muted pub-sub">Association Sportive</p>
          </div>
        </div>

        <StatusBanner adherent={adherent} />

        <div className="pub-qr" ref={qrRef}>
          <QRCodeCanvas value={adherent.id} size={200} />
        </div>

        <p className="muted pub-hint">
          {valide
            ? 'Présentez ce QR Code au responsable sportif pour valider votre participation.'
            : 'Votre licence est incomplète. Contactez le bureau pour régulariser votre situation.'}
        </p>

        <button className="btn-ghost pub-dl" onClick={telechargerQr}>
          Télécharger le QR Code
        </button>
      </div>
    </div>
  );
}
