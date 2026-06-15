import { useState } from 'react';
import Papa from 'papaparse';
import { api } from '../lib/api';

function normaliser(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function versBool(v) {
  return ['oui', 'true', '1', 'x', 'vrai'].includes(normaliser(v));
}

export default function ImportCsvModal({ onClose, onImported }) {
  const [etat, setEtat] = useState(null);
  const [enCours, setEnCours] = useState(false);

  function gererFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEtat(null);

    Papa.parse(fichier, {
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
      const nom = (l.nom || '').trim();
      const prenom = (l.prenom || '').trim();
      const email = (l.email || '').trim();

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
        manque_passsport: paiement ? false : versBool(l.manque_passsport),
      });
    }

    if (valides.length === 0) {
      setEtat(
        `Aucune ligne valide. ${ignorees} ligne(s) ignoree(s) : nom, prenom et email sont obligatoires.`
      );
      return;
    }

    setEnCours(true);
    try {
      const data = await api.importAdherents(valides);
      onImported(data);
      setEtat(
        `${data.length} adherent(s) importe(s).` + (ignorees ? ` ${ignorees} ligne(s) ignoree(s).` : '')
      );
    } catch (error) {
      setEtat('Import impossible : ' + error.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Importer des adherents (CSV)</h3>
        <p className="muted import-aide">
          Fichier CSV avec une ligne d'en-tetes. Colonnes <code>nom</code>, <code>prenom</code>,{' '}
          <code>email</code> obligatoires ; <code>fiche</code>, <code>paiement</code>,{' '}
          <code>manque_paiement</code>, <code>manque_yeps</code>, <code>manque_passsport</code>{' '}
          facultatives (valeurs Oui/Non).
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={gererFichier}
          disabled={enCours}
        />

        {enCours && <p>Import en cours...</p>}
        {etat && <p className="import-etat">{etat}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
