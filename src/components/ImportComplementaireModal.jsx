import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

function normaliser(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function versBool(v) {
  const n = normaliser(v);
  return n === 'oui' || n === 'true' || n === '1' || n === 'x' || n === 'vrai';
}

// Colonnes complémentaires reconnues → champ DB correspondant
const CHAMPS_COMPL = [
  { db: 'adherent_bde',        bool: true,  patterns: ['adherent bde', 'bde'] },
  { db: 'licence_ffsu_a_jour', bool: true,  patterns: ['licence ffsu', 'ffsu', 'licence a jour'] },
  { db: 'fiche_renseignement', bool: true,  patterns: ['fiche renseignement', 'fiche'] },
  { db: 'paiement_global',     bool: true,  patterns: ['paiement global'] },
  { db: 'manque_paiement',     bool: true,  patterns: ['manque paiement'] },
  { db: 'manque_yeps',         bool: true,  patterns: ['yeps'] },
  { db: 'manque_passport',     bool: true,  patterns: ['passport', 'pass sport'] },
  { db: 'situation_handicap',  bool: true,  patterns: ['handicap'] },
  { db: 'droit_image',         bool: true,  patterns: ['droit image', 'autorisation image'] },
  { db: 'annee_etude',         bool: false, patterns: ['annee', 'promotion'] },
  { db: 'telephone',           bool: false, patterns: ['telephone'] },
  { db: 'sexe',                bool: false, patterns: ['sexe'] },
];

export default function ImportComplementaireModal({ onClose, onImported }) {
  const [etat, setEtat] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef(null);

  async function parseCsv(fichier) {
    const buffer = await fichier.arrayBuffer();
    let texte;
    try { texte = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { texte = new TextDecoder('windows-1252').decode(buffer); }
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
    setEnCours(true);

    let lignes;
    try {
      lignes = fichier.name.toLowerCase().endsWith('.xlsx')
        ? await parseXlsx(fichier)
        : await parseCsv(fichier);
    } catch {
      setEtat('Impossible de lire le fichier.');
      setEnCours(false);
      return;
    }

    if (lignes.length === 0) { setEtat('Fichier vide.'); setEnCours(false); return; }

    const cles = Object.keys(lignes[0]);

    // Détecter les colonnes complémentaires présentes
    const champsDetectes = CHAMPS_COMPL.filter((champ) =>
      champ.patterns.some((p) => cles.some((k) => k.includes(p)))
    );

    if (champsDetectes.length === 0) {
      setEtat(
        'Aucune colonne reconnue pour mise à jour.\n' +
        'Colonnes détectées : ' + cles.slice(0, 6).join(', ')
      );
      setEnCours(false);
      return;
    }

    function valeurChamp(row, champ) {
      for (const p of champ.patterns) {
        const cle = cles.find((k) => k.includes(p));
        if (cle) return String(row[cle] ?? '');
      }
      return '';
    }

    // Colonnes de correspondance
    const emailCol = cles.find((k) => k === 'email' || k.includes('email'));
    const nomCol   = cles.find((k) => k === 'nom');
    const prenomCol = cles.find((k) => k === 'prenom');

    if (!emailCol && !nomCol && !prenomCol) {
      setEtat('Impossible de trouver une colonne de correspondance (email, nom ou prénom).');
      setEnCours(false);
      return;
    }

    // Charger tous les adhérents pour la correspondance
    const { data: tousAdherents } = await supabase
      .from('adherents')
      .select('id, email, nom, prenom');

    let modifies = 0;
    let nonTrouves = 0;
    let erreurs = 0;

    for (const ligne of lignes) {
      let adherent = null;

      // Correspondance par email en priorité
      if (emailCol) {
        const email = normaliser(ligne[emailCol] ?? '');
        if (email) adherent = tousAdherents.find((a) => normaliser(a.email ?? '') === email);
      }

      // Fallback : nom + prénom normalisés
      if (!adherent && nomCol && prenomCol) {
        const nomNorm = normaliser(ligne[nomCol] ?? '');
        const prenomNorm = normaliser(ligne[prenomCol] ?? '');
        if (nomNorm && prenomNorm) {
          adherent = tousAdherents.find(
            (a) => normaliser(a.nom) === nomNorm && normaliser(a.prenom) === prenomNorm
          );
        }
      }

      if (!adherent) { nonTrouves++; continue; }

      // Construire l'objet de mise à jour
      const updates = {};
      for (const champ of champsDetectes) {
        const val = valeurChamp(ligne, champ);
        if (val !== '') {
          updates[champ.db] = champ.bool ? versBool(val) : val.trim();
        }
      }

      if (Object.keys(updates).length === 0) continue;

      const { error } = await supabase.from('adherents').update(updates).eq('id', adherent.id);
      if (error) erreurs++;
      else modifies++;
    }

    setEnCours(false);
    setEtat(
      `${modifies} adhérent(s) mis à jour.` +
      (nonTrouves > 0 ? ` ${nonTrouves} non trouvé(s) dans la base (ignoré(s)).` : '') +
      (erreurs > 0 ? ` ${erreurs} erreur(s).` : '') +
      `\nChamps mis à jour : ${champsDetectes.map((c) => c.db).join(', ')}.`
    );
    onImported();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Importer des informations complémentaires</h3>
        <p className="muted import-aide">
          Fichier CSV ou Excel avec les colonnes <code>nom</code>, <code>prenom</code> et/ou{' '}
          <code>email</code> pour identifier les adhérents, plus les colonnes à mettre à jour
          (ex. <code>adherent bde</code>, <code>licence ffsu</code>, <code>yeps</code>…).
          Seuls les adhérents déjà présents dans la base sont mis à jour — aucune création.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv"
          style={{ display: 'none' }}
          onChange={gererFichier}
          disabled={enCours}
        />

        <div className="import-btns">
          <button
            className="btn-ghost"
            onClick={() => { inputRef.current.value = ''; inputRef.current.click(); }}
            disabled={enCours}
          >
            {enCours ? 'Import en cours…' : 'Choisir le fichier (CSV ou Excel)'}
          </button>
        </div>

        {etat && <p className="import-etat" style={{ whiteSpace: 'pre-line' }}>{etat}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
