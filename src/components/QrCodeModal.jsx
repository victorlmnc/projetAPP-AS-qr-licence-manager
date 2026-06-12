import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

// Affiche le QR Code de l'adhérent et permet de le télécharger.
// Le QR encode uniquement l'id (UUID) : c'est ce que le Coach lira au scan.
export default function QrCodeModal({ adherent, onClose }) {
  const wrapRef = useRef(null);

  function telechargerPng() {
    // qrcode.react rend un <canvas> : on le récupère pour l'exporter en image.
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;

    const lien = document.createElement('a');
    lien.href = canvas.toDataURL('image/png');
    lien.download = `licence-${adherent.nom}-${adherent.prenom}.png`;
    lien.click();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>QR Code — {adherent.prenom} {adherent.nom}</h3>
        <p className="muted">À remettre à l'adhérent (par mail ou imprimé).</p>

        <div className="qr-wrap" ref={wrapRef}>
          <QRCodeCanvas value={adherent.id} size={220} />
        </div>

        <p className="qr-id">id : {adherent.id}</p>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
          <button onClick={telechargerPng}>Télécharger le PNG</button>
        </div>
      </div>
    </div>
  );
}
