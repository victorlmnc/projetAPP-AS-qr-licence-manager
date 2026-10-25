import { useId, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';

const MODES = [
  { value: 'ignore', label: 'Ne pas changer' },
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
];

function modeVersBool(mode) {
  if (mode === 'true') return true;
  if (mode === 'false') return false;
  return null;
}

// Le flocage est remis avec le maillot : pas de choix à part.
const ARTICLES_MERCH = [
  { cle: 'maillot', libelle: 'Maillot récupéré' },
  { cle: 'short', libelle: 'Short récupéré' },
];

export default function BulkAdherentEditor({ adherents, onClose, onSaved }) {
  const [questionnaireMode, setQuestionnaireMode] = useState('ignore');
  const [paiementGlobalMode, setPaiementGlobalMode] = useState('ignore');
  const [manquePaiementMode, setManquePaiementMode] = useState('ignore');
  const [manqueYepsMode, setManqueYepsMode] = useState('ignore');
  const [manquePassportMode, setManquePassportMode] = useState('ignore');
  const [remiseModes, setRemiseModes] = useState({ maillot: 'ignore', short: 'ignore' });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const titreId = useId();

  const noms = useMemo(
    () => adherents.slice(0, 3).map((adherent) => `${adherent.prenom ?? ''} ${adherent.nom ?? ''}`.trim()).filter(Boolean),
    [adherents]
  );

  const resume = useMemo(() => {
    if (adherents.length <= 3) return noms.join(', ');
    return `${noms.join(', ')} + ${adherents.length - 3} autre(s)`;
  }, [adherents.length, noms]);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);

    const update = {};

    if (questionnaireMode !== 'ignore') {
      update.questionnaire_sante_ok = modeVersBool(questionnaireMode);
    }

    if (paiementGlobalMode !== 'ignore') {
      const paiementGlobal = modeVersBool(paiementGlobalMode);
      update.paiement_global = paiementGlobal;

      if (paiementGlobal) {
        update.manque_paiement = false;
        update.manque_yeps = false;
        update.manque_passport = false;
      }
    }

    if (manquePaiementMode !== 'ignore') {
      update.manque_paiement = modeVersBool(manquePaiementMode);
    }
    if (manqueYepsMode !== 'ignore') {
      update.manque_yeps = modeVersBool(manqueYepsMode);
    }
    if (manquePassportMode !== 'ignore') {
      update.manque_passport = modeVersBool(manquePassportMode);
    }

    if (
      update.manque_paiement === true ||
      update.manque_yeps === true ||
      update.manque_passport === true
    ) {
      update.paiement_global = false;
    }

    if (update.paiement_global === true) {
      update.manque_paiement = false;
      update.manque_yeps = false;
      update.manque_passport = false;
    }

    const remises = ARTICLES_MERCH
      .filter(({ cle }) => remiseModes[cle] !== 'ignore')
      .map(({ cle }) => [cle, modeVersBool(remiseModes[cle])]);

    if (Object.keys(update).length === 0 && remises.length === 0) {
      setErreur('Choisis au moins un champ à modifier.');
      return;
    }

    setEnCours(true);
    const ids = adherents.map((adherent) => adherent.id);
    try {
      if (Object.keys(update).length > 0) {
        const { error } = await supabase.from('adherents').update(update).in('id', ids);
        if (error) throw error;
      }

      // La remise ne s'applique qu'aux adhérents qui ont commandé l'article.
      for (const [article, recupere] of remises) {
        const { error } = await supabase
          .from('adherents')
          .update({ [`${article}_recupere`]: recupere })
          .in('id', ids)
          .eq(article, true);
        if (error) throw error;
      }

      const { data, error } = await supabase.from('adherents').select('*').in('id', ids);
      if (error) throw error;
      onSaved(data ?? []);
    } catch (err) {
      setErreur('Modification impossible : ' + err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      dismissible={!enCours}
      labelledBy={titreId}
      className="modal modal--wide bulk-editor"
    >
      <h3 id={titreId}>Modifier la sélection</h3>
      <p className="muted bulk-editor__intro">
        {adherents.length} adhérent(s) sélectionné(s)
      </p>
      {resume && <p className="bulk-editor__resume">{resume}</p>}

      <form onSubmit={enregistrer}>
        <div className="bulk-editor__grid">
          <label className="champ">
            Questionnaire santé OK
            <select value={questionnaireMode} onChange={(e) => setQuestionnaireMode(e.target.value)}>
              {MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>

          <label className="champ">
            Paiement global à jour
            <select value={paiementGlobalMode} onChange={(e) => setPaiementGlobalMode(e.target.value)}>
              {MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>

          <label className="champ">
            Manque paiement
            <select value={manquePaiementMode} onChange={(e) => setManquePaiementMode(e.target.value)}>
              {MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>

          <label className="champ">
            Manque YEPS
            <select value={manqueYepsMode} onChange={(e) => setManqueYepsMode(e.target.value)}>
              {MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>

          <label className="champ">
            Manque PASS'SPORT
            <select value={manquePassportMode} onChange={(e) => setManquePassportMode(e.target.value)}>
              {MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted small bulk-editor__hint">
          Si « Paiement global à jour » passe à Oui, les manques de paiement, YEPS et PASS'SPORT seront remis à Non.
        </p>

        <p className="editor-section-title">Remise du merch</p>
        <div className="bulk-editor__grid">
          {ARTICLES_MERCH.map(({ cle, libelle }) => (
            <label key={cle} className="champ">
              {libelle}
              <select
                value={remiseModes[cle]}
                onChange={(e) => setRemiseModes((m) => ({ ...m, [cle]: e.target.value }))}
              >
                {MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="muted small bulk-editor__hint">
          Ne s'applique qu'aux adhérents qui ont commandé l'article. Le flocage est remis avec le maillot.
        </p>

        {erreur && <p className="error">{erreur}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={enCours}>Annuler</button>
          <button type="submit" disabled={enCours}>
            {enCours ? 'Modification…' : 'Appliquer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
