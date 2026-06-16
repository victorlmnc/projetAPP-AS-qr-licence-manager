import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { reparerTexte } from '../lib/texte';

function normaliser(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function versBool(v) {
  const n = normaliser(v);
  return n === 'oui' || n === 'true' || n === '1' || n === 'x' || n === 'vrai';
}

// Cherche la valeur d'une colonne dont la clé normalisée correspond à l'un des patterns.
// Essaie d'abord la correspondance exacte, puis substring.
function lire(row, ...patterns) {
  for (const pattern of patterns) {
    if (row[pattern] !== undefined) return String(row[pattern] ?? '');
    const cle = Object.keys(row).find((k) => k.includes(pattern));
    if (cle !== undefined) return String(row[cle] ?? '');
  }
  return '';
}

function mapperLigne(row) {
  // Types de licence (valeurs séparées par ; dans la cellule)
  const licenceRaw = lire(row, 'je souhaite prendre une licence');
  const types_licence = licenceRaw.split(';').flatMap((t) => {
    const n = normaliser(t);
    if (n.includes('sportive')) return ['Sportive'];
    if (n.includes('arbitre')) return ['Arbitre'];
    if (n.includes('encadrant') || (n.includes('responsable') && n.includes('sport'))) return ['Encadrant'];
    return [];
  });

  // Boursier éligible Pass'Sport → pré-cocher manque_passport
  const boursierRaw = lire(row, 'je suis boursier', 'eligible au pass sport');
  const est_boursier = normaliser(boursierRaw).includes('oui');

  // Questionnaire santé : "J'ai répondu NON à toutes les questions" = OK (pas de certificat)
  const santeRaw = lire(row, 'questionnaire de sante', "j'ai repondu non a toutes");
  const questionnaire_sante_ok = santeRaw !== '' && !normaliser(santeRaw).includes("n'ai pas");

  // Activité à contraintes particulières
  const contraintesRaw = lire(row, 'activite a contraintes', 'contraintes particulieres');
  const activite_contraintes = normaliser(contraintesRaw).startsWith('oui');

  // Droit à l'image
  const droitRaw = lire(row, 'autorisation droit', "droit a l");
  const droit_image = versBool(droitRaw);

  // Situation de handicap
  const handicapRaw = lire(row, 'situation de handicap');
  const situation_handicap = versBool(handicapRaw);

  // Responsable d'une AS (colonne séparée du forms)
  const respRaw = lire(row, "es-tu responsable");
  const est_responsable_as = versBool(respRaw);

  const nom = reparerTexte(lire(row, 'nom')).trim();
  const prenom = reparerTexte(lire(row, 'prenom')).trim();
  const email = lire(row, 'email').trim().toLowerCase() || null;

  return {
    nom,
    prenom,
    email,
    sexe: lire(row, 'sexe').trim() || null,
    annee_etude: lire(row, 'annee').trim() || null,
    date_naissance: lire(row, 'date de naissance').trim() || null,
    pays_naissance: reparerTexte(lire(row, 'pays de naissance')).trim() || null,
    dept_naissance: lire(row, 'numero du departement').trim() || null,
    ville_naissance: reparerTexte(lire(row, 'ville de naissance')).trim() || null,
    adresse: reparerTexte(lire(row, 'adresse')).trim() || null,
    code_postal: lire(row, 'code postal').trim() || null,
    // Accès direct pour éviter les conflits avec "ville de naissance"
    ville: reparerTexte(String(row['ville'] ?? '')).trim() || null,
    telephone: lire(row, 'numero de telephone').trim() || null,
    types_licence: types_licence.length > 0 ? types_licence : null,
    est_responsable_as,
    situation_handicap,
    droit_image,
    questionnaire_sante_ok,
    activite_contraintes,
    manque_passport: est_boursier,
  };
}

export default function ImportFormsModal({ onClose, onImported }) {
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

    // Mapper et filtrer les lignes invalides (nom + prénom requis)
    const mappees = lignes.map(mapperLigne).filter((a) => a.nom && a.prenom);

    // Dédupliquer par email (garder la dernière occurrence — soumission multiple du forms)
    const dedupMap = new Map();
    for (const a of mappees) {
      const cle = a.email ?? `__${a.nom}|${a.prenom}`;
      dedupMap.set(cle, a);
    }
    const uniques = [...dedupMap.values()];

    if (uniques.length === 0) {
      setEtat('Aucune ligne valide (nom et prénom requis).');
      setEnCours(false);
      return;
    }

    // Chercher les adhérents existants par email
    const emails = uniques.map((a) => a.email).filter(Boolean);
    let existants = [];
    if (emails.length > 0) {
      const { data } = await supabase.from('adherents').select('id, email').in('email', emails);
      existants = data ?? [];
    }
    const emailsMap = new Map(existants.map((a) => [a.email?.toLowerCase(), a.id]));

    const aInserer = [];
    const aModifier = [];

    for (const adherent of uniques) {
      if (adherent.email && emailsMap.has(adherent.email)) {
        aModifier.push({ id: emailsMap.get(adherent.email), ...adherent });
      } else {
        aInserer.push(adherent);
      }
    }

    let crees = [];
    const modifies = [];
    let erreurs = 0;

    if (aInserer.length > 0) {
      const { data, error } = await supabase.from('adherents').insert(aInserer).select();
      if (error) erreurs++;
      else crees = data ?? [];
    }

    for (const { id, ...donnees } of aModifier) {
      const { data, error } = await supabase
        .from('adherents')
        .update(donnees)
        .eq('id', id)
        .select()
        .single();
      if (error) erreurs++;
      else if (data) modifies.push(data);
    }

    setEnCours(false);
    const total = crees.length + modifies.length;
    setEtat(
      `${total} adhérent(s) traité(s) : ${crees.length} créé(s), ${modifies.length} mis à jour.` +
      (erreurs > 0 ? ` ${erreurs} erreur(s).` : '')
    );
    onImported([...crees, ...modifies]);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Importer les données du forms</h3>
        <p className="muted import-aide">
          Fichier CSV ou Excel exporté depuis Google Forms. Les adhérents dont l'email existe déjà
          sont mis à jour ; les autres sont créés. En cas de double soumission du forms, la dernière
          version est conservée.
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
            {enCours ? 'Import en cours…' : 'Choisir le fichier du forms (CSV ou Excel)'}
          </button>
        </div>

        {etat && <p className="import-etat">{etat}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
