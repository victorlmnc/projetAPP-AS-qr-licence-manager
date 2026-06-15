import { useMemo, useState } from 'react';
import { nomComplet, reparerTexte } from '../lib/texte';

// Modale de confirmation avant l'envoi groupé des QR codes.
// `adherents` = liste des adhérents éligibles (email présent, pas encore reçu le QR).
// `onConfirm(ids)` = appelé avec la liste des IDs sélectionnés.
export default function EnvoiQrModal({ adherents, onClose, onConfirm }) {
  const [recherche, setRecherche] = useState('');
  const [selectionnes, setSelectionnes] = useState(() => new Set(adherents.map((a) => a.id)));

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return adherents;
    return adherents.filter((a) => {
      const nom = reparerTexte(a.nom).toLowerCase();
      const prenom = reparerTexte(a.prenom).toLowerCase();
      return (
        nom.includes(q) ||
        prenom.includes(q) ||
        `${prenom} ${nom}`.includes(q) ||
        `${nom} ${prenom}`.includes(q)
      );
    });
  }, [adherents, recherche]);

  function toggleTout() {
    if (selectionnes.size === adherents.length) {
      setSelectionnes(new Set());
    } else {
      setSelectionnes(new Set(adherents.map((a) => a.id)));
    }
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

  const tousCoches = selectionnes.size === adherents.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--envoi" onClick={(e) => e.stopPropagation()}>
        <h3>Envoyer les QR Codes par email</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          {selectionnes.size} destinataire(s) sélectionné(s) sur {adherents.length} éligible(s)
        </p>

        <input
          className="envoi-search"
          placeholder="Rechercher un nom ou prénom…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoFocus
        />

        <div className="envoi-list-header">
          <label className="envoi-item envoi-item--header">
            <input
              type="checkbox"
              checked={tousCoches}
              onChange={toggleTout}
            />
            <span style={{ fontWeight: 600 }}>
              {tousCoches ? 'Tout décocher' : 'Tout cocher'}
            </span>
            <span className="muted small" style={{ marginLeft: 'auto' }}>
              {filtres.length} résultat(s)
            </span>
          </label>
        </div>

        <div className="envoi-list">
          {filtres.length === 0 && (
            <p className="muted small" style={{ padding: '12px 0', textAlign: 'center' }}>
              Aucun résultat.
            </p>
          )}
          {filtres.map((a) => (
            <label key={a.id} className="envoi-item">
              <input
                type="checkbox"
                checked={selectionnes.has(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span className="envoi-item__name">
                {nomComplet(a)}
              </span>
              <span className="muted small envoi-item__email">{a.email}</span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button onClick={confirmer} disabled={selectionnes.size === 0}>
            Envoyer à {selectionnes.size} personne(s)
          </button>
        </div>
      </div>
    </div>
  );
}
