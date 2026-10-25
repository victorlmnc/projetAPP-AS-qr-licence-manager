import { useId, useMemo } from 'react';
import {
  informationsManquantes, recapCommande, tableauFlocages, tableauParTaille, taillesTriees,
} from '../lib/merch';
import { nomComplet } from '../lib/texte';
import Modal from './Modal';

const formatNombre = new Intl.NumberFormat('fr-FR').format;
const CONTACT_AS = 'asso.sportive-bourges@insa-cvl.fr';

// Police intégrée au PDF : les polices standard des PDF ne connaissent pas les
// lettres comme « Ś » ou « ă », qui doivent pourtant être floquées telles quelles.
// Chargée seulement à la génération d'un bon de commande.
async function chargerPolice(doc) {
  const enBase64 = async (fichier) => {
    const reponse = await fetch(`/fonts/${fichier}`);
    if (!reponse.ok) throw new Error(`Police ${fichier} introuvable`);
    const octets = new Uint8Array(await reponse.arrayBuffer());
    let binaire = '';
    for (let i = 0; i < octets.length; i += 0x8000) {
      binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
    }
    return btoa(binaire);
  };
  const [normal, gras] = await Promise.all([enBase64('DejaVuSans.ttf'), enBase64('DejaVuSans-Bold.ttf')]);
  doc.addFileToVFS('DejaVuSans.ttf', normal);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', gras);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
  return 'DejaVu';
}

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

  // Fichier Excel pour le fournisseur, sans nom d'adhérent. Pas de CSV : selon
  // le logiciel et la langue, il s'ouvre parfois en une seule colonne.
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

  // Bon de commande PDF : même contenu que le fichier Excel, mis en page pour
  // être envoyé ou imprimé tel quel. Aucun nom d'adhérent.
  async function telechargerBonPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    // Hors ligne, on garde la police standard plutôt que de ne rien produire.
    const police = await chargerPolice(doc).catch(() => 'helvetica');
    const marge = 16;
    const encre = [24, 24, 27];
    const discret = [113, 113, 122];

    doc.setTextColor(...encre);
    doc.setFont(police, 'bold');
    doc.setFontSize(18);
    doc.text('Bon de commande merch', marge, 22);

    doc.setFont(police, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...discret);
    doc.text("Association Sportive de l'INSA CVL (Bourges)", marge, 29);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, marge, 34);
    doc.text(`Contact : ${CONTACT_AS}`, marge, 39);

    const tableau = {
      theme: 'grid',
      margin: { left: marge, right: marge },
      styles: { font: police, fontSize: 10, cellPadding: 2.6, textColor: encre, lineColor: [228, 228, 231], lineWidth: 0.2 },
      headStyles: { fillColor: [244, 244, 245], textColor: encre, fontStyle: 'bold' },
      footStyles: { fillColor: [250, 250, 250], textColor: encre, fontStyle: 'bold' },
    };
    const titreSection = (texte, y) => {
      doc.setFont(police, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...encre);
      doc.text(texte, marge, y);
    };
    // Colonnes de quantités alignées à droite partout : en-tête, lignes et total.
    const alignerQuantites = (colonnes) => (cellule) => {
      if (colonnes.includes(cellule.column.index)) cellule.cell.styles.halign = 'right';
    };

    const parTaille = tableauParTaille(recap);
    titreSection('Quantités par taille', 52);
    autoTable(doc, {
      ...tableau,
      startY: 56,
      head: [['Taille', 'Maillots', 'Dont floqués', 'Shorts']],
      body: parTaille.slice(0, -1),
      foot: [parTaille[parTaille.length - 1]],
      didParseCell: alignerQuantites([1, 2, 3]),
    });

    const flocages = tableauFlocages(recap);
    if (flocages.length > 0) {
      const y = doc.lastAutoTable.finalY + 12;
      titreSection('Flocages (nom au dos du maillot)', y);
      autoTable(doc, {
        ...tableau,
        startY: y + 4,
        head: [['Taille du maillot', 'Texte à floquer au dos', 'Quantité']],
        body: flocages,
        columnStyles: { 1: { fontStyle: 'bold' } },
        didParseCell: alignerQuantites([2]),
      });
    }

    if (manques) {
      doc.setFont(police, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...discret);
      doc.text(`À préciser avant production : ${manques}.`, marge, doc.lastAutoTable.finalY + 10);
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFont(police, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...discret);
      doc.text(`Page ${page} / ${pages}`, doc.internal.pageSize.getWidth() - marge, 287, { align: 'right' });
    }

    doc.save(`bon-de-commande-merch-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          <>
            <button type="button" className="btn-ghost" onClick={telechargerBonPdf}>
              Bon de commande (PDF)
            </button>
            <button type="button" className="btn-ghost" onClick={telechargerCommande}>
              Télécharger la commande (Excel)
            </button>
          </>
        )}
        <button type="button" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}
