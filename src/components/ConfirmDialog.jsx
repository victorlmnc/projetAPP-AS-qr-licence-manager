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
  return (
    <div className="modal-overlay modal-overlay--top" onClick={onCancel}>
      <div className={`modal confirm-modal ${danger ? 'confirm-modal--danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon" aria-hidden="true">
          {danger ? '!' : '?'}
        </div>
        <h3>{title}</h3>
        <p className="muted">{message}</p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? 'btn-danger' : ''} onClick={onConfirm} disabled={loading}>
            {loading ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
