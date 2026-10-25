import { useId, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { lireTableur } from '../lib/fichierTableur';
import { detecterColonnes, preparerImport, regrouperCommandes, resumeChangements } from '../lib/importMerch';
import { nomComplet } from '../lib/texte';
import Modal from './Modal';

const LIBELLES_COLONNES = {
  email: 'Email',
  nom: 'Nom',
  prenom: 'Prénom',
  formule: 'Formule',
  tailleMaillot: 'Taille maillot',
  tailleShort: 'Taille short',
  taille: 'Taille',
  texteFlocage: 'Texte flocage',
};

// Modèle à remplir si l'export du site de paiement ne convient pas.
async function telechargerModele() {
  const XLSX = await import('xlsx');
  const feuille = XLSX.utils.aoa_to_sheet([
    ['Email', 'Nom', 'Prénom', 'Formule', 'Taille maillot', 'Taille short', 'Texte flocage'],
    ['jeanne.martin@example.com', 'Martin', 'Jeanne', 'Licence + maillot', 'M', '', ''],
    ['jeanne.martin@example.com', 'Martin', 'Jeanne', 'Flocage (nom au dos)', '', '', 'MARTIN'],
    ['lucas.bernard@example.com', 'Bernard', 'Lucas', 'Licence + ensemble (avec YEPS)', 'L', 'L', ''],
  ]);
  feuille['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 15 }, { wch: 13 }, { wch: 16 }];
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Commandes');
  XLSX.writeFile(classeur, 'modele-import-merch.xlsx');
}

// Import des commandes de merch : lecture du fichier, aperçu, puis application.
export default function ImportMerchModal({ adherents, onClose, onImported }) {
  const titreId = useId();
  const inputRef = useRef(null);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);

  async function lireFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setErreur(null);
    setApercu(null);
    setResultat(null);

    let lignes;
    try {
      lignes = await lireTableur(fichier);
    } catch {
      setErreur('Impossible de lire le fichier.');
      return;
    }
    if (lignes.length === 0) {
      setErreur('Le fichier est vide.');
      return;
    }

    const colonnes = detecterColonnes(Object.keys(lignes[0]));
    if (!colonnes.email && !(colonnes.nom && colonnes.prenom)) {
      setErreur("Aucune colonne pour retrouver les adhérents : il faut un email, ou un nom et un prénom.");
      return;
    }
    if (!colonnes.formule && !colonnes.tailleMaillot && !colonnes.tailleShort && !colonnes.texteFlocage) {
      setErreur('Aucune colonne de commande reconnue (formule, taille du maillot ou du short, flocage).');
      return;
    }

    const plan = preparerImport(regrouperCommandes(lignes, colonnes), adherents);
    setApercu({ ...plan, colonnes, nbLignes: lignes.length });
  }

  async function appliquer() {
    setEnCours(true);
    const echecs = [];
    for (const { adherent, changements } of apercu.miseAJour) {
      const { error } = await supabase.from('adherents').update(changements).eq('id', adherent.id);
      if (error) echecs.push(`${nomComplet(adherent)} : ${error.message}`);
    }
    setEnCours(false);
    setResultat({ ok: apercu.miseAJour.length - echecs.length, echecs });
    setApercu(null);
    onImported();
  }

  const colonnesUtilisees = apercu
    ? Object.entries(apercu.colonnes).filter(([, nom]) => nom).map(([cle, nom]) => `${LIBELLES_COLONNES[cle]} → « ${nom} »`)
    : [];

  return (
    <Modal onClose={onClose} dismissible={!enCours} labelledBy={titreId} className="modal modal--wide">
      <h3 id={titreId}>Importer des commandes de merch</h3>
      <p className="muted import-aide">
        Fichier CSV ou Excel exporté du site de paiement, ou rempli à partir du modèle. Chaque adhérent
        est retrouvé par son email, sinon par son nom et son prénom. L'import ajoute les articles, les
        tailles et les flocages : il ne retire rien et ne modifie pas les remises.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv"
        style={{ display: 'none' }}
        onChange={lireFichier}
      />

      <div className="import-btns">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => { inputRef.current.value = ''; inputRef.current.click(); }}
          disabled={enCours}
        >
          Choisir le fichier (CSV ou Excel)
        </button>
        <button type="button" className="btn-ghost" onClick={telechargerModele} disabled={enCours}>
          Télécharger le modèle
        </button>
      </div>

      {erreur && <p className="error" role="alert">{erreur}</p>}

      {apercu && (
        <div className="import-merch" aria-label="Aperçu de l'import">
          <p className="muted small">
            {apercu.nbLignes} ligne(s) lue(s). Colonnes utilisées : {colonnesUtilisees.join(', ')}.
          </p>

          {apercu.miseAJour.length === 0 ? (
            <p className="import-etat">Aucune fiche à mettre à jour : tout est déjà noté.</p>
          ) : (
            <div className="import-merch__liste">
              <table className="recap-merch__table">
                <thead>
                  <tr><th>Adhérent</th><th>À noter</th></tr>
                </thead>
                <tbody>
                  {apercu.miseAJour.map(({ adherent, changements }) => (
                    <tr key={adherent.id}>
                      <td>{nomComplet(adherent)}</td>
                      <td>{resumeChangements(changements, adherent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {apercu.introuvables.length > 0 && (
            <div className="import-merch__alerte">
              <p>{apercu.introuvables.length} commande(s) sans fiche correspondante, ignorée(s) :</p>
              <ul>
                {apercu.introuvables.map((c) => (
                  <li key={c.email || `${c.nom}|${c.prenom}`}>{c.email || `${c.prenom} ${c.nom}`}</li>
                ))}
              </ul>
            </div>
          )}

          {apercu.avertissements.length > 0 && (
            <div className="import-merch__alerte">
              <ul>
                {apercu.avertissements.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {resultat && (
        <p className="import-etat" role="status">
          {resultat.ok} fiche(s) mise(s) à jour.
          {resultat.echecs.length > 0 && `\n${resultat.echecs.length} erreur(s) :\n${resultat.echecs.join('\n')}`}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={enCours}>
          {apercu ? 'Annuler' : 'Fermer'}
        </button>
        {apercu && apercu.miseAJour.length > 0 && (
          <button type="button" onClick={appliquer} disabled={enCours}>
            {enCours ? 'Import en cours…' : `Appliquer (${apercu.miseAJour.length})`}
          </button>
        )}
      </div>
    </Modal>
  );
}
