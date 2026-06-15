import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import { publicAdherentUrl } from '../lib/publicAccess';
import { nomComplet, reparerTexte } from '../lib/texte';
import StatusBanner from '../components/StatusBanner';

async function chargerAdherentPublic(token) {
  const res = await fetch(`/api/public-adherent?token=${encodeURIComponent(token)}`);
  const contentType = res.headers.get('content-type') || '';

  if (res.ok && contentType.includes('application/json')) {
    return res.json();
  }

  if (!import.meta.env.DEV) {
    const body = contentType.includes('application/json') ? await res.json() : {};
    throw new Error(body.error || 'Aucun adherent trouve pour ce QR Code.');
  }

  // En dev Vite simple, les fonctions Vercel /api ne tournent pas. On garde un fallback local.
  let fallback = await supabase
    .from('adherents')
    .select('id, public_token, nom, prenom, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport')
    .eq('public_token', token)
    .maybeSingle();

  if (!fallback.data && !fallback.error) {
    fallback = await supabase
      .from('adherents')
      .select('id, public_token, nom, prenom, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passport')
      .eq('id', token)
      .maybeSingle();
  }

  if (fallback.error || !fallback.data) {
    throw new Error('Aucun adherent trouve pour ce QR Code.');
  }

  return fallback.data;
}

export default function AdherentPublic() {
  const { id: token } = useParams();
  const [adherent, setAdherent] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    let annule = false;

    async function charger() {
      setChargement(true);
      setErreur(null);

      try {
        const data = await chargerAdherentPublic(token);
        if (!annule) setAdherent(data);
      } catch (err) {
        if (!annule) setErreur(err.message);
      } finally {
        if (!annule) setChargement(false);
      }
    }

    charger();
    return () => {
      annule = true;
    };
  }, [token]);

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
        <p className="centered">Chargement...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="pub-page">
        <div className="pub-card">
          <p className="error pub-error">{erreur}</p>
        </div>
      </div>
    );
  }

  const { valide } = calculerStatutLicence(adherent);
  const lienPublic = publicAdherentUrl(adherent);

  return (
    <div className="pub-page">
      <div className="pub-card">
        <div className="pub-header pub-header--center">
          <img src="/logo.png" alt="Logo AS" className="pub-logo" />
          <p className="muted pub-sub">Association Sportive</p>
        </div>

        <div className="pub-identity">
          <span className="pub-label">Licence de</span>
          <h1 className="pub-name">{nomComplet(adherent)}</h1>
        </div>

        <StatusBanner adherent={adherent} />

        <div className="pub-qr" ref={qrRef}>
          <QRCodeCanvas value={lienPublic} size={210} />
        </div>

        <p className="muted pub-hint">
          {valide
            ? 'Nom et statut a verifier par le coach avant participation.'
            : 'Licence incomplete : merci de contacter le bureau pour regulariser.'}
        </p>

        <button className="btn-ghost pub-dl" onClick={telechargerQr}>
          Telecharger le QR Code
        </button>
      </div>
    </div>
  );
}
