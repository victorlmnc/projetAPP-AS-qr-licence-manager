import { useId, useMemo } from 'react';
import { recapCommande, taillesTriees } from '../lib/merch';
import { nomComplet } from '../lib/texte';
import Modal from './Modal';

const formatNombre = new Intl.NumberFormat('fr-FR').format;

function champCsv(valeur) {
  return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
}

// « 12 commandés · 5 remis · 7 à remettre »
function suivi({ total, remis }) {
  return `${formatNombre(total)} commandé${total > 1 ? 's' : ''} · ${formatNombre(remis)} remis · ${formatNombre(total - remis)} à remettre`;
}

function TableauTailles({ titre, article }) {
  if (article.total === 0) return null;
  return (
    <section className="recap-merch__bloc" aria-label={titre}>
      <h4>{titre}</h4>
      <p className="muted small">{suivi(article)}</p>
      <table className="recap-merch__table">
        <thead>
          <tr><th>Taille</th><th>Quantité</th></tr>
        </thead>
        <tbody>
          {taillesTriees(article.tailles).map(([taille, quantite]) => (
            <tr key={taille}><td>{taille}</td><td>{formatNombre(quantite)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Récapitulatif de toutes les commandes de merch : quantités à commander au
// fournisseur, textes à floquer, et où en est la distribution.
export default function RecapMerchModal({ adherents, onClose }) {
  const titreId = useId();
  const recap = useMemo(() => recapCommande(adherents), [adherents]);
  const rien = recap.maillot.total + recap.short.total + recap.flocage.total === 0;

  function exporterCsv() {
    const lignes = [['Article', 'Taille', 'Quantité'].map(champCsv).join(';')];
    for (const [cle, libelle] of [['maillot', 'Maillot'], ['short', 'Short']]) {
      for (const [taille, quantite] of taillesTriees(recap[cle].tailles)) {
        lignes.push([libelle, taille, quantite].map(champCsv).join(';'));
      }
    }
    lignes.push('', ['Adhérent', 'Texte floqué', 'Taille du maillot'].map(champCsv).join(';'));
    for (const f of recap.flocage.textes) {
      lignes.push([nomComplet(f.adherent), f.texte, f.tailleMaillot].map(champCsv).join(';'));
    }

    const blob = new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `commande-merch-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal onClose={onClose} labelledBy={titreId} className="modal modal--wide recap-merch">
      <h3 id={titreId}>Commande merch</h3>

      {rien ? (
        <p className="muted">Aucun merch commandé pour l'instant.</p>
      ) : (
        <>
          <div className="recap-merch__grille">
            <TableauTailles titre="Maillots" article={recap.maillot} />
            <TableauTailles titre="Shorts" article={recap.short} />
          </div>

          {recap.flocage.total > 0 && (
            <section className="recap-merch__bloc" aria-label="Flocages">
              <h4>Flocages</h4>
              <p className="muted small">{suivi(recap.flocage)}</p>
              <table className="recap-merch__table">
                <thead>
                  <tr><th>Adhérent</th><th>Texte</th><th>Maillot</th><th>Remis</th></tr>
                </thead>
                <tbody>
                  {recap.flocage.textes.map((f) => (
                    <tr key={f.adherent.id}>
                      <td>{nomComplet(f.adherent)}</td>
                      <td className="recap-merch__texte">{f.texte || <span className="muted">À préciser</span>}</td>
                      <td>{f.tailleMaillot || '—'}</td>
                      <td>{f.recupere ? 'Oui' : 'Non'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <div className="modal-actions">
        {!rien && (
          <button type="button" className="btn-ghost" onClick={exporterCsv}>
            Exporter en CSV
          </button>
        )}
        <button type="button" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}
