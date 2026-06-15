import { useMemo, useState } from 'react';
import { nomComplet, reparerTexte } from '../lib/texte';

export default function EnvoiQrModal({
  adherents,
  title = 'Envoyer les QR Codes par email',
  subtitle = '',
  confirmLabel = 'Envoyer',
  onClose,
  onConfirm,
}) {
  const [recherche, setRecherche] = useState('');
  const [selectionnes, setSelectionnes] = useState(() => new Set(adherents.map((a) => a.id)));

  const filtres = useMemo(() => {
    const norm = (s) =>
      reparerTexte(String(s ?? ''))
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    const q = norm(recherche);
    if (!q) return adherents;

    return adherents.filter((a) => {
      const nom = norm(a.nom);
      const prenom = norm(a.prenom);
      return (
        nom.includes(q) ||
        prenom.includes(q) ||
        `${prenom} ${nom}`.includes(q) ||
        `${nom} ${prenom}`.includes(q)
      );
    });
  }, [adherents, recherche]);

  const tousCoches = selectionnes.size === adherents.length && adherents.length > 0;

  function toggleTout() {
    setSelectionnes(tousCoches ? new Set() : new Set(adherents.map((a) => a.id)));
  }

  function toggle(id) {
    setSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmer() {
    const ids = adherents.filter((a) => selectionnes.has(a.id)).map((a) => a.id);
    onConfirm(ids);
  }

  return (
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="modal modal--envoi" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted">
          {subtitle || `${selectionnes.size} destinataire(s) selectionne(s) sur ${adherents.length}.`}
        </p>

        <input
          className="envoi-search"
          placeholder="Rechercher un nom ou prenom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoFocus
        />

        <div className="envoi-list">
          <label className="envoi-item envoi-item--header">
            <input type="checkbox" checked={tousCoches} onChange={toggleTout} />
            <span>{tousCoches ? 'Tout decocher' : 'Tout cocher'}</span>
            <span className="muted small envoi-count">{filtres.length} resultat(s)</span>
          </label>

          {filtres.length === 0 && (
            <p className="muted small envoi-empty">Aucun resultat.</p>
          )}

          {filtres.map((a) => (
            <label key={a.id} className="envoi-item">
              <input
                type="checkbox"
                checked={selectionnes.has(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span className="envoi-item__name">{nomComplet(a)}</span>
              <span className="muted small envoi-item__email">{a.email}</span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button onClick={confirmer} disabled={selectionnes.size === 0}>
            {confirmLabel} ({selectionnes.size})
          </button>
        </div>
      </div>
    </div>
  );
}
