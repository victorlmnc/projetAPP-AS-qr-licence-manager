import { useId } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titreId = useId();

  return (
    <Modal
      onClose={onCancel}
      dismissible={!loading}
      role="alertdialog"
      labelledBy={titreId}
      className={`modal confirm-modal ${danger ? 'confirm-modal--danger' : ''}`}
    >
      <h3 id={titreId}>{title}</h3>
      <p className="muted">{message}</p>

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button type="button" className={danger ? 'btn-danger' : ''} onClick={onConfirm} disabled={loading}>
          {loading ? 'En cours…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
