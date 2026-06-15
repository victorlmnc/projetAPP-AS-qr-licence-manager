import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { reparerTexte } from '../lib/texte';

// Normalise un en-tête de colonne : minuscules, sans accents, sans espaces autour.
function normaliser(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Interprète une valeur texte comme un booléen (Oui / true / 1 / x / vrai = vrai).
function versBool(v) {
  return ['oui', 'true', '1', 'x', 'vrai'].includes(normaliser(v));
}

// Modale d'import CSV. Fichier attendu (1re ligne = en-têtes) :
//   nom, prenom, email                                   -> obligatoires
//   fiche, paiement                                      -> Oui/Non, facultatifs
//   manque_paiement, manque_yeps, manque_passport       -> Oui/Non, facultatifs
// onImported(nouveauxAdherents) est appelé après un import réussi.
export default function ImportCsvModal({ onClose, onImported }) {
  const [etat, setEtat] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function lireCsv(fichier) {
    const buffer = await fichier.arrayBuffer();

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      return new TextDecoder('windows-1252').decode(buffer);
    }
  }

  async function gererFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEtat(null);

    const contenu = await lireCsv(fichier);

    Papa.parse(contenu, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normaliser,
      complete: (resultat) => importer(resultat.data),
      error: () => setEtat('Impossible de lire le fichier.'),
    });
  }

  async function importer(lignes) {
    const valides = [];
    let ignorees = 0;

    for (const l of lignes) {
      const nom = reparerTexte(l.nom).trim();
      const prenom = reparerTexte(l.prenom).trim();
      const email = (l.email || '').trim();

      // L'e-mail est obligatoire (cohérent avec le formulaire).
      if (!nom || !prenom || !email) {
        ignorees++;
        continue;
      }

      const paiement = versBool(l.paiement);
      valides.push({
        nom,
        prenom,
        email,
        fiche_renseignement: versBool(l.fiche),
        paiement_global: paiement,
        manque_paiement: paiement ? false : versBool(l.manque_paiement),
        manque_yeps: paiement ? false : versBool(l.manque_yeps),
        manque_passport: paiement ? false : versBool(l.manque_passport),
      });
    }

    if (valides.length === 0) {
      setEtat(
        `Aucune ligne valide. ${ignorees} ligne(s) ignorée(s) — nom, prénom et e-mail sont obligatoires.`
      );
      return;
    }

    setEnCours(true);
    const { data, error } = await supabase.from('adherents').insert(valides).select();
    setEnCours(false);

    if (error) {
      setEtat('Import impossible : ' + error.message);
      return;
    }

    onImported(data);
    setEtat(
      `${data.length} adhérent(s) importé(s).` + (ignorees ? ` ${ignorees} ligne(s) ignorée(s).` : '')
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Importer des adhérents (CSV)</h3>
        <p className="muted import-aide">
          Fichier CSV avec une ligne d'en-têtes. Colonnes <code>nom</code>, <code>prenom</code>,{' '}
          <code>email</code> obligatoires ; <code>fiche</code>, <code>paiement</code>,{' '}
          <code>manque_paiement</code>, <code>manque_yeps</code>, <code>manque_passport</code>{' '}
          facultatives (valeurs Oui/Non).
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={gererFichier}
          disabled={enCours}
        />

        {enCours && <p>Import en cours…</p>}
        {etat && <p className="import-etat">{etat}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
