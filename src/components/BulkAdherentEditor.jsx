import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export default function BulkAdherentEditor({ adherents, onClose, onSaved }) {
  const [questionnaireMode, setQuestionnaireMode] = useState('ignore');
  const [paiementGlobalMode, setPaiementGlobalMode] = useState('ignore');
  const [manquePaiementMode, setManquePaiementMode] = useState('ignore');
  const [manqueYepsMode, setManqueYepsMode] = useState('ignore');
  const [manquePassportMode, setManquePassportMode] = useState('ignore');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

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

    if (Object.keys(update).length === 0) {
      setErreur('Choisis au moins un champ a modifier.');
      return;
    }

    setEnCours(true);
    const ids = adherents.map((adherent) => adherent.id);
    const { data, error } = await supabase
      .from('adherents')
      .update(update)
      .in('id', ids)
      .select();
    setEnCours(false);

    if (error) {
      setErreur('Modification impossible : ' + error.message);
      return;
    }

    onSaved(data ?? []);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide bulk-editor" onClick={(e) => e.stopPropagation()}>
        <h3>Modifier la selection</h3>
        <p className="muted bulk-editor__intro">
          {adherents.length} adherent(s) selectionne(s)
        </p>
        {resume && <p className="bulk-editor__resume">{resume}</p>}

        <form onSubmit={enregistrer}>
          <div className="bulk-editor__grid">
            <label className="champ">
              Questionnaire sante OK
              <select value={questionnaireMode} onChange={(e) => setQuestionnaireMode(e.target.value)}>
                {MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </label>

            <label className="champ">
              Paiement global a jour
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
            Si "Paiement global a jour" passe a Oui, les manques de paiement, YEPS et PASS'SPORT seront remis a Non.
          </p>

          {erreur && <p className="error">{erreur}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={enCours}>Annuler</button>
            <button type="submit" disabled={enCours}>
              {enCours ? 'Modification...' : 'Appliquer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
