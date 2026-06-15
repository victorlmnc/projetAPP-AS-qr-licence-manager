import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet, reparerTexte } from '../lib/texte';
import ConfirmDialog from './ConfirmDialog';

export default function AdherentEditor({ adherent, onClose, onSaved, onDeleted }) {
  const creation = !adherent;

  const [form, setForm] = useState({
    nom: reparerTexte(adherent?.nom),
    prenom: reparerTexte(adherent?.prenom),
    email: adherent?.email ?? '',
    fiche_renseignement: adherent?.fiche_renseignement ?? false,
    paiement_global: adherent?.paiement_global ?? false,
    manque_paiement: adherent?.manque_paiement ?? false,
    manque_yeps: adherent?.manque_yeps ?? false,
    manque_passport: adherent?.manque_passport ?? false,
  });
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);

  function set(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  const apercu = calculerStatutLicence(form);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);

    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      setErreur("Le nom, le prenom et l'e-mail sont obligatoires.");
      return;
    }
    if (!form.email.includes('@')) {
      setErreur("L'e-mail ne semble pas valide.");
      return;
    }

    const donnees = {
      nom: reparerTexte(form.nom).trim(),
      prenom: reparerTexte(form.prenom).trim(),
      email: form.email.trim(),
      fiche_renseignement: form.fiche_renseignement,
      paiement_global: form.paiement_global,
      manque_paiement: form.paiement_global ? false : form.manque_paiement,
      manque_yeps: form.paiement_global ? false : form.manque_yeps,
      manque_passport: form.paiement_global ? false : form.manque_passport,
    };

    setEnCours(true);
    const requete = creation
      ? supabase.from('adherents').insert(donnees).select().single()
      : supabase.from('adherents').update(donnees).eq('id', adherent.id).select().single();

    const { data, error } = await requete;
    setEnCours(false);

    if (error) {
      setErreur('Enregistrement impossible : ' + error.message);
      return;
    }
    onSaved(data);
  }

  async function supprimer() {
    setErreur(null);
    setSuppression(true);
    const { error } = await supabase.from('adherents').delete().eq('id', adherent.id);
    setSuppression(false);
    setConfirmationSuppression(false);

    if (error) {
      setErreur('Suppression impossible : ' + error.message);
      return;
    }
    onDeleted(adherent);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="editor" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={enregistrer}>
          <h3>{creation ? 'Nouvel adherent' : `Modifier - ${nomComplet(adherent)}`}</h3>

          <div className="editor-grid">
            <label>
              Prenom
              <input type="text" value={form.prenom}
                     onChange={(e) => set('prenom', e.target.value)} />
            </label>
            <label>
              Nom
              <input type="text" value={form.nom}
                     onChange={(e) => set('nom', e.target.value)} />
            </label>
          </div>

          <label>
            E-mail
            <input type="email" value={form.email}
                   onChange={(e) => set('email', e.target.value)} />
          </label>

          <hr />

          <label className="check">
            <input type="checkbox" checked={form.fiche_renseignement}
                   onChange={(e) => set('fiche_renseignement', e.target.checked)} />
            Fiche de renseignement a jour
          </label>

          <label className="check">
            <input type="checkbox" checked={form.paiement_global}
                   onChange={(e) => set('paiement_global', e.target.checked)} />
            Paiement global a jour
          </label>

          {!form.paiement_global && (
            <fieldset className="manques">
              <legend>Ce qu'il manque :</legend>
              <label className="check">
                <input type="checkbox" checked={form.manque_paiement}
                       onChange={(e) => set('manque_paiement', e.target.checked)} />
                Paiement (cheque, especes, CB...)
              </label>
              <label className="check">
                <input type="checkbox" checked={form.manque_yeps}
                       onChange={(e) => set('manque_yeps', e.target.checked)} />
                Aide YEPS
              </label>
              <label className="check">
                <input type="checkbox" checked={form.manque_passport}
                       onChange={(e) => set('manque_passport', e.target.checked)} />
                Aide PASS'SPORT
              </label>
            </fieldset>
          )}

          <div className={`apercu ${apercu.valide ? 'apercu--ok' : 'apercu--ko'}`}>
            Statut resultant : <strong>{apercu.valide ? 'A jour' : 'Non a jour'}</strong>
          </div>

          {erreur && <p className="error">{erreur}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={enCours}>
              {enCours ? 'Enregistrement...' : creation ? 'Creer' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {!creation && (
          <div className="editor-danger">
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirmationSuppression(true)}
              disabled={suppression}
            >
              {suppression ? 'Suppression...' : 'Supprimer cet adherent'}
            </button>
          </div>
        )}
      </aside>

      {confirmationSuppression && (
        <ConfirmDialog
          danger
          loading={suppression}
          title="Supprimer cet adherent ?"
          message={`La fiche de ${nomComplet(adherent)} sera supprimee. Vous pourrez annuler depuis l'historique recent tant que la page reste ouverte.`}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmationSuppression(false)}
          onConfirm={supprimer}
        />
      )}
    </div>
  );
}
