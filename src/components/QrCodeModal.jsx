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

  function envoyerParMail() {
    if (!adherent.email) return;

    const sujet = `Votre QR Code licence - ${adherent.prenom} ${adherent.nom}`;
    const profilUrl = `${window.location.origin}/profil`;
    const corps = [
      `Bonjour ${adherent.prenom},`,
      'Voici les informations de votre licence.',
      `Identifiant QR : ${adherent.id}`,
      `Vous pouvez consulter votre profil ici : ${profilUrl}`,
      'Vous pouvez aussi présenter le QR Code envoyé ou imprimé au coach.',
      'Sportivement,',
      'Le bureau',
    ].join('\n\n');

    window.location.href = `mailto:${encodeURIComponent(adherent.email)}?subject=${encodeURIComponent(
      sujet
    )}&body=${encodeURIComponent(corps)}`;
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
          <button
            onClick={envoyerParMail}
            disabled={!adherent.email}
            title={!adherent.email ? "Aucun e-mail enregistré pour cet adhérent" : undefined}
          >
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
