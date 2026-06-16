import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { reparerTexte } from '../lib/texte';

function normaliser(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function versBool(v) {
  return ['oui', 'true', '1', 'x', 'vrai'].includes(normaliser(v));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ImportCsvModal({ onClose, onImported, formatInitial = null }) {
  const [etat, setEtat] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef(null);

  function ouvrirPicker(filtre) {
    if (inputRef.current) {
      inputRef.current.accept = filtre;
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  // Si un format est pré-sélectionné, ouvrir le sélecteur de fichier directement
  useEffect(() => {
    if (formatInitial === 'csv') ouvrirPicker('.csv,text/csv');
    else if (formatInitial === 'xlsx') ouvrirPicker('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }, []);

  async function parseCsv(fichier) {
    const buffer = await fichier.arrayBuffer();
    let texte;
    try {
      texte = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      texte = new TextDecoder('windows-1252').decode(buffer);
    }
    return new Promise((resolve, reject) => {
      Papa.parse(texte, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normaliser,
        complete: (r) => resolve(r.data),
        error: reject,
      });
    });
  }

  async function parseXlsx(fichier) {
    const buffer = await fichier.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rows.map((row) => {
      const normalized = {};
      for (const key of Object.keys(row)) {
        normalized[normaliser(key)] = String(row[key] ?? '');
      }
      return normalized;
    });
  }

  async function gererFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEtat(null);

    let lignes;
    try {
      const estXlsx = fichier.name.toLowerCase().endsWith('.xlsx');
      lignes = estXlsx ? await parseXlsx(fichier) : await parseCsv(fichier);
    } catch {
      setEtat('Impossible de lire le fichier.');
      return;
    }

    importer(lignes);
  }

  async function importer(lignes) {
    const valides = [];
    let ignorees = 0;

    for (const l of lignes) {
      const nom = reparerTexte(l.nom).trim();
      const prenom = reparerTexte(l.prenom).trim();
      const email = (l.email || '').trim() || null;

      if (!nom || !prenom) { ignorees++; continue; }
      if (email && !EMAIL_RE.test(email)) { ignorees++; continue; }

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
        `Aucune ligne valide. ${ignorees} ligne(s) ignorée(s) — nom et prénom obligatoires, e-mail optionnel mais doit être valide si renseigné.`
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
        <h3>Importer des adhérents</h3>
        <p className="muted import-aide">
          Fichier CSV ou Excel (.xlsx) avec une ligne d'en-têtes. Colonnes{' '}
          <code>nom</code>, <code>prenom</code>, <code>email</code> (optionnel) ;{' '}
          <code>fiche</code>, <code>paiement</code>, <code>manque_paiement</code>,{' '}
          <code>manque_yeps</code>, <code>manque_passport</code> facultatives (valeurs Oui/Non).
        </p>

        {/* Input caché — accept changé dynamiquement selon le format choisi */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={gererFichier}
          disabled={enCours}
        />

        <div className="import-btns">
          <button className="btn-ghost" onClick={() => ouvrirPicker('.csv,text/csv')} disabled={enCours}>
            Choisir un CSV
          </button>
          <button className="btn-ghost" onClick={() => ouvrirPicker('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')} disabled={enCours}>
            Choisir un Excel (.xlsx)
          </button>
        </div>

        {enCours && <p>Import en cours…</p>}
        {etat && <p className="import-etat">{etat}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
