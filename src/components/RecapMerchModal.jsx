import { useId, useMemo } from 'react';
import {
  informationsManquantes, recapCommande, tableauFlocages, tableauParTaille, taillesTriees,
} from '../lib/merch';
import { nomComplet } from '../lib/texte';
import Modal from './Modal';

const formatNombre = new Intl.NumberFormat('fr-FR').format;
const CONTACT_AS = 'asso.sportive-bourges@insa-cvl.fr';

// « 1 maillot sans taille, 2 flocages sans texte »
function texteManques({ maillotsSansTaille, shortsSansTaille, flocagesSansTexte }) {
  return [
    [maillotsSansTaille, 'maillot sans taille', 'maillots sans taille'],
    [shortsSansTaille, 'short sans taille', 'shorts sans taille'],
    [flocagesSansTexte, 'flocage sans texte', 'flocages sans texte'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, un, plusieurs]) => `${formatNombre(n)} ${n > 1 ? plusieurs : un}`)
    .join(', ');
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
  const manques = texteManques(informationsManquantes(recap));

  // Fichier Excel pour le fournisseur : chaque information dans sa case, aucun
  // nom d'adhérent. Excel plutôt que CSV : un CSV s'ouvre parfois en une seule
  // colonne selon le logiciel et la langue (séparateur « ; » ou « , »).
  async function telechargerCommande() {
    const XLSX = await import('xlsx');
    const date = new Date().toLocaleDateString('fr-FR');
    const entete = [
      ["Commande merch : Association Sportive de l'INSA CVL (Bourges)"],
      [`Date : ${date}`],
      [`Contact : ${CONTACT_AS}`],
      [],
    ];

    const classeur = XLSX.utils.book_new();

    const parTaille = XLSX.utils.aoa_to_sheet([
      ...entete,
      ['Taille', 'Maillots', 'Dont floqués', 'Shorts'],
      ...tableauParTaille(recap),
    ]);
    parTaille['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(classeur, parTaille, 'Quantités par taille');

    const flocages = tableauFlocages(recap);
    if (flocages.length > 0) {
      const feuille = XLSX.utils.aoa_to_sheet([
        ...entete,
        ['Taille du maillot', 'Texte à floquer au dos', 'Quantité'],
        ...flocages,
      ]);
      feuille['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(classeur, feuille, 'Flocages');
    }

    XLSX.writeFile(classeur, `commande-merch-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

      {!rien && manques && (
        <p className="recap-merch__alerte" role="status">
          À compléter avant d'envoyer la commande : {manques}.
        </p>
      )}

      <div className="modal-actions">
        {!rien && (
          <button type="button" className="btn-ghost" onClick={telechargerCommande}>
            Télécharger la commande (Excel)
          </button>
        )}
        <button type="button" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}
