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

  // Ouvre le logiciel de messagerie du bureau, pré-adressé à l'adhérent.
  // mailto ne peut pas joindre d'image : le bureau attache le PNG téléchargé.
  function envoyerParMail() {
    const sujet = encodeURIComponent('Votre QR Code de licence');
    const corps = encodeURIComponent(
      `Bonjour ${adherent.prenom},\n\n` +
        `Voici votre QR Code de licence (en pièce jointe). ` +
        `Présentez-le à votre coach lors des entraînements et des matchs.\n\n` +
        `Sportivement,\nLe bureau`
    );
    window.location.href = `mailto:${adherent.email}?subject=${sujet}&body=${corps}`;
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
          <button className="btn-ghost" onClick={telechargerPng}>Télécharger le PNG</button>
          <button onClick={envoyerParMail} disabled={!adherent.email}>
            Envoyer par e-mail
          </button>
        </div>

        {!adherent.email && (
          <p className="qr-id">Aucun e-mail enregistré pour cet adhérent.</p>
        )}
      </div>
    </div>
  );
}
