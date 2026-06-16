import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { nomComplet, reparerTexte } from '../lib/texte';
import { publicAdherentUrl, publicToken } from '../lib/publicAccess';

export default function QrCodeModal({ adherent, onClose }) {
  const wrapRef = useRef(null);
  const [envoi, setEnvoi] = useState(null); // null | 'loading' | 'ok' | { error: string }
  const token = publicToken(adherent);
  const lienPublic = publicAdherentUrl(adherent);

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
      if (data.sent === 0) throw new Error('Email non envoyé (vérifiez la config Gmail)');
      setEnvoi('ok');
    } catch (err) {
      setEnvoi({ error: err.message });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>QR Code — {nomComplet(adherent)}</h3>
        <p className="muted">À remettre à l'adhérent (par mail ou imprimé).</p>

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

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
          <button className="btn-ghost" onClick={telechargerPng} disabled={!token}>Télécharger le PNG</button>
          <button
            onClick={envoyerParMail}
            disabled={!adherent.email || !token || envoi === 'loading' || envoi === 'ok'}
            title={!token ? 'Token public manquant' : !adherent.email ? 'Aucun e-mail enregistré pour cet adhérent' : undefined}
          >
            {envoi === 'loading' ? 'Envoi…' : envoi === 'ok' ? 'Envoyé ✓' : 'Envoyer par e-mail'}
          </button>
        </div>

        {!adherent.email && (
          <p className="qr-id">Aucun e-mail enregistré pour cet adhérent.</p>
        )}
      </div>
    </div>
  );
}
