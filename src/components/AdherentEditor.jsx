import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet, reparerTexte } from '../lib/texte';
import ConfirmDialog from './ConfirmDialog';

// Panneau latéral de saisie.
//   adherent = null  -> mode création
//   adherent = objet -> mode mise à jour rapide
// onSaved(adherentEnregistré) est appelé après succès (insert ou update).
// onDeleted(id) est appelé après une suppression réussie.
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

  // Aperçu en direct : on rejoue la logique partagée sur l'état du formulaire.
  const apercu = calculerStatutLicence(form);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);

    if (!form.nom.trim() || !form.prenom.trim()) {
      setErreur("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setErreur("L’adresse e-mail n’est pas valide.");
      return;
    }

    // Si le paiement est à jour, les "manque…" n'ont plus de sens : on les remet à false.
    const donnees = {
      nom: reparerTexte(form.nom).trim(),
      prenom: reparerTexte(form.prenom).trim(),
      email: form.email.trim() || null,
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

  // Supprime définitivement la fiche, après confirmation.
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
    onDeleted(adherent.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="editor" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={enregistrer}>
          <h3>{creation ? 'Nouvel adhérent' : `Modifier — ${nomComplet(adherent)}`}</h3>

          <div className="editor-grid">
            <label>
              Prénom
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
            Fiche de renseignement à jour
          </label>

          <label className="check">
            <input type="checkbox" checked={form.paiement_global}
                   onChange={(e) => set('paiement_global', e.target.checked)} />
            Paiement global à jour
          </label>

          {/* Détail des manques : visible uniquement si le paiement n'est PAS à jour */}
          {!form.paiement_global && (
            <fieldset className="manques">
              <legend>Ce qu'il manque :</legend>
              <label className="check">
                <input type="checkbox" checked={form.manque_paiement}
                       onChange={(e) => set('manque_paiement', e.target.checked)} />
                Paiement (chèque, espèces, CB…)
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

          {/* Aperçu du statut qui sera enregistré */}
          <div className={`apercu ${apercu.valide ? 'apercu--ok' : 'apercu--ko'}`}>
            Statut résultant : <strong>{apercu.valide ? 'À jour' : 'Non à jour'}</strong>
          </div>

          {erreur && <p className="error">{erreur}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={enCours}>
              {enCours ? 'Enregistrement…' : creation ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>

        {/* Suppression : disponible uniquement en mode édition */}
        {!creation && (
          <div className="editor-danger">
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirmationSuppression(true)}
              disabled={suppression}
            >
              {suppression ? 'Suppression…' : 'Supprimer cet adhérent'}
            </button>
          </div>
        )}
      </aside>

      {confirmationSuppression && (
        <ConfirmDialog
          danger
          loading={suppression}
          title="Supprimer cet adhérent ?"
          message={`La fiche de ${nomComplet(adherent)} sera supprimée définitivement.`}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmationSuppression(false)}
          onConfirm={supprimer}
        />
      )}
    </div>
  );
}
