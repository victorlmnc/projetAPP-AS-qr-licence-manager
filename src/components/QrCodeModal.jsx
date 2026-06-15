import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { publicAdherentUrl, publicToken } from '../lib/publicAccess';
import { supabase } from '../lib/supabase';
import { nomComplet, reparerTexte } from '../lib/texte';

export default function QrCodeModal({ adherent, onClose }) {
  const wrapRef = useRef(null);
  const [envoi, setEnvoi] = useState(null);
  const lienPublic = publicAdherentUrl(adherent);
  const token = publicToken(adherent);

  function telechargerPng() {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;

    const lien = document.createElement('a');
    lien.href = canvas.toDataURL('image/png');
    lien.download = `licence-${reparerTexte(adherent.nom)}-${reparerTexte(adherent.prenom)}.png`;
    lien.click();
  }

  async function envoyerParMail() {
    if (!adherent.email) return;
    setEnvoi('loading');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenSession = sessionData.session?.access_token;
      if (!tokenSession) throw new Error('Session bureau introuvable.');

      const res = await fetch('/api/send-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenSession}`,
        },
        body: JSON.stringify({ adherentIds: [adherent.id] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      if (data.errors?.length > 0) throw new Error(data.errors[0].raison);
      if (data.sent === 0) throw new Error('Email non envoye. Verifiez la configuration Gmail.');

      setEnvoi('ok');
    } catch (err) {
      setEnvoi({ error: err.message });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>QR Code - {nomComplet(adherent)}</h3>
        <p className="muted">A remettre a l'adherent par mail, lien ou impression.</p>

        <div className="qr-wrap" ref={wrapRef}>
          <QRCodeCanvas value={lienPublic} size={220} />
        </div>

        <p className="qr-id">Lien public : {lienPublic}</p>
        <p className="qr-id">Token QR : {token}</p>

        {envoi === 'ok' && (
          <p className="small send-ok">Email envoye a {adherent.email}</p>
        )}
        {envoi?.error && (
          <p className="small error">Echec : {envoi.error}</p>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
          <button className="btn-ghost" onClick={telechargerPng}>Telecharger le PNG</button>
          <button
            onClick={envoyerParMail}
            disabled={!adherent.email || envoi === 'loading' || envoi === 'ok'}
            title={!adherent.email ? "Aucun e-mail enregistre pour cet adherent" : undefined}
          >
            {envoi === 'loading' ? 'Envoi...' : envoi === 'ok' ? 'Envoye' : 'Envoyer par e-mail'}
          </button>
        </div>

        {!adherent.email && (
          <p className="qr-id">Aucun e-mail enregistre pour cet adherent.</p>
        )}
      </div>
    </div>
  );
}
