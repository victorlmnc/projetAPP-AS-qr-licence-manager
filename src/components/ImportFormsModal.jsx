import { useId, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import { lireTableur } from '../lib/fichierTableur';
import { mapperLigne, normaliserEntetes } from '../lib/importForms';

export default function ImportFormsModal({ onClose, onImported }) {
  const [etat, setEtat] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef(null);
  const titreId = useId();

  async function gererFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEtat(null);
    setEnCours(true);

    let lignes;
    try {
      lignes = (await lireTableur(fichier)).map(normaliserEntetes);
    } catch {
      setEtat('Impossible de lire le fichier.');
      setEnCours(false);
      return;
    }

    // Mapper et filtrer les lignes invalides (nom + prénom requis)
    const mappees = lignes.map(mapperLigne).filter((a) => a.nom && a.prenom);

    // Dédupliquer par email : en cas de soumissions multiples, garder la dernière
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

    // Chercher les adhérents existants par email, sans tenir compte de la casse
    // (un email saisi à la main peut contenir des majuscules).
    const { data: existants, error: erreurLecture } = await supabase
      .from('adherents')
      .select('id, email')
      .not('email', 'is', null);
    if (erreurLecture) {
      setEtat('Lecture des adhérents impossible : ' + erreurLecture.message);
      setEnCours(false);
      return;
    }
    const emailsMap = new Map(existants.map((a) => [a.email.trim().toLowerCase(), a.id]));

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
    const echecs = [];

    if (aInserer.length > 0) {
      const { data, error } = await supabase.from('adherents').insert(aInserer).select();
      if (!error) {
        crees = data ?? [];
      } else {
        // Une seule ligne invalide fait échouer tout le lot :
        // on réessaie ligne par ligne pour ne perdre que les lignes en erreur.
        for (const adherent of aInserer) {
          const { data: cree, error: erreurLigne } = await supabase
            .from('adherents')
            .insert(adherent)
            .select()
            .single();
          if (erreurLigne) echecs.push(`${adherent.prenom} ${adherent.nom}`);
          else crees.push(cree);
        }
      }
    }

    // Champs gérés par le bureau après le premier import : on ne les écrase pas.
    // Le questionnaire santé peut seulement passer à OK, jamais revenir en arrière
    // (le bureau a pu le valider à la main, par exemple après un certificat).
    for (const { id, manque_paiement: _mp, questionnaire_sante_ok, ...donnees } of aModifier) {
      if (questionnaire_sante_ok) donnees.questionnaire_sante_ok = true;

      const { data, error } = await supabase
        .from('adherents')
        .update(donnees)
        .eq('id', id)
        .select()
        .single();
      if (error) echecs.push(`${donnees.prenom} ${donnees.nom}`);
      else if (data) modifies.push(data);
    }

    setEnCours(false);
    const total = crees.length + modifies.length;
    setEtat(
      `${total} adhérent(s) traité(s) : ${crees.length} créé(s), ${modifies.length} mis à jour.` +
      (echecs.length > 0 ? `\n${echecs.length} erreur(s) : ${echecs.join(', ')}.` : '')
    );
    onImported([...crees, ...modifies]);
  }

  return (
    <Modal onClose={onClose} dismissible={!enCours} labelledBy={titreId} className="modal modal--wide">
      <h3 id={titreId}>Importer les données du forms</h3>
      <p className="muted import-aide">
        Fichier CSV ou Excel exporté depuis Google Forms. Les adhérents dont l'email existe déjà
        sont mis à jour ; les autres sont créés. En cas de double soumission du forms, la dernière
        version est conservée. Une mise à jour ne modifie pas le paiement
        et ne retire jamais un questionnaire santé déjà validé.
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

      {etat && <p className="import-etat" role="status">{etat}</p>}

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}
