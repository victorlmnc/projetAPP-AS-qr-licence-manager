import { useId, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { nomComplet, reparerTexte } from '../lib/texte';
import { publicAdherentUrl, publicToken } from '../lib/publicAccess';
import Modal from './Modal';

export default function QrCodeModal({ adherent, onClose }) {
  const wrapRef = useRef(null);
  const [envoi, setEnvoi] = useState(null);
  const token = publicToken(adherent);
  const lienPublic = publicAdherentUrl(adherent);
  const envoiEnCours = envoi === 'loading';
  const titreId = useId();
  const titreEnvoiId = useId();

  function telechargerPng() {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const lien = document.createElement('a');
    lien.href = canvas.toDataURL('image/png');
    lien.download = `licence-${reparerTexte(adherent.nom)}-${reparerTexte(adherent.prenom)}.png`;
    lien.click();
  }

  async function envoyerParMail() {
    if (!adherent.email || !token) return;
    setEnvoi('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ adherentIds: [adherent.id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      if (data.errors?.length > 0) throw new Error(data.errors[0].raison);
      if (data.sent === 0) throw new Error('Email non envoyé (vérifiez la configuration Gmail)');
      setEnvoi('ok');
    } catch (err) {
      setEnvoi({ error: err.message });
    }
  }

  return (
    <Modal onClose={onClose} dismissible={!envoiEnCours} labelledBy={titreId}>
      <h3 id={titreId}>QR Code — {nomComplet(adherent)}</h3>
      <p className="muted">À remettre à l'adhérent par email, lien ou impression.</p>

      {token ? (
        <div className="qr-wrap" ref={wrapRef}>
          <QRCodeCanvas value={lienPublic} size={220} />
        </div>
      ) : (
        <p className="error" style={{ textAlign: 'center' }}>
          Token public manquant. Relancez le script SQL pour remplir public_token.
        </p>
      )}

      {token && (
        <>
          <p className="qr-id">Lien public : {lienPublic}</p>
          <p className="qr-id">Token QR : {token}</p>
        </>
      )}

      <div aria-live="polite">
        {envoi === 'ok' && (
          <p className="small" style={{ color: 'var(--ok)', textAlign: 'center', margin: '8px 0 0' }}>
            Email envoyé à {adherent.email}
          </p>
        )}
        {envoi?.error && (
          <p className="error" style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 13 }}>
            Échec : {envoi.error}
          </p>
        )}
      </div>

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose} disabled={envoiEnCours}>Fermer</button>
        <button className="btn-ghost" onClick={telechargerPng} disabled={!token || envoiEnCours}>
          Télécharger le PNG
        </button>
        <button
          onClick={envoyerParMail}
          disabled={!adherent.email || !token || envoiEnCours || envoi === 'ok'}
          title={!token ? 'Token public manquant' : !adherent.email ? 'Aucun email enregistré pour cet adhérent' : undefined}
        >
          {envoiEnCours ? 'Envoi…' : envoi === 'ok' ? 'Envoyé' : 'Envoyer par email'}
        </button>
      </div>

      {!adherent.email && (
        <p className="qr-id">Aucun email enregistré pour cet adhérent.</p>
      )}

      {envoiEnCours && (
        <Modal
          dismissible={false}
          role="alertdialog"
          labelledBy={titreEnvoiId}
          className="modal sending-modal"
        >
          <div className="sending-spinner" aria-hidden="true" />
          <h3 id={titreEnvoiId}>Envoi en cours…</h3>
          <p className="muted">L'email est en train d'être envoyé.</p>
          <p className="sending-modal__warning">
            Ne quittez pas et ne rafraîchissez pas la page.
          </p>
        </Modal>
      )}
    </Modal>
  );
}
