import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet, reparerTexte } from '../lib/texte';
import { LONGUEUR_MAX_FLOCAGE, TAILLES } from '../lib/merch';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

const TYPES_LICENCE = ['Sportive', 'Arbitre', 'Encadrant'];

// Tailles proposées ; une taille importée hors liste reste sélectionnable.
function optionsTaille(tailleActuelle) {
  return tailleActuelle && !TAILLES.includes(tailleActuelle) ? [...TAILLES, tailleActuelle] : TAILLES;
}

export default function AdherentEditor({ adherent, onClose, onSaved, onDeleted }) {
  const creation = !adherent;
  const [onglet, setOnglet] = useState('licence'); // 'licence' | 'infos' | 'merch'

  // Valeurs de départ, gardées pour savoir si la fiche a été modifiée.
  const [formInitial] = useState(() => ({
    nom: reparerTexte(adherent?.nom) ?? '',
    prenom: reparerTexte(adherent?.prenom) ?? '',
    email: adherent?.email ?? '',
    telephone: adherent?.telephone ?? '',
    sexe: adherent?.sexe ?? '',
    annee_etude: adherent?.annee_etude ?? '',
    date_naissance: adherent?.date_naissance ?? '',
    pays_naissance: reparerTexte(adherent?.pays_naissance) ?? '',
    dept_naissance: adherent?.dept_naissance ?? '',
    ville_naissance: reparerTexte(adherent?.ville_naissance) ?? '',
    adresse: reparerTexte(adherent?.adresse) ?? '',
    code_postal: adherent?.code_postal ?? '',
    ville: reparerTexte(adherent?.ville) ?? '',
    types_licence: adherent?.types_licence ?? [],
    est_responsable_as: adherent?.est_responsable_as ?? false,
    adherent_bde: adherent?.adherent_bde ?? false,
    licence_ffsu_a_jour: adherent?.licence_ffsu_a_jour ?? false,
    questionnaire_sante_ok: adherent?.questionnaire_sante_ok ?? false,
    activite_contraintes: adherent?.activite_contraintes ?? false,
    situation_handicap: adherent?.situation_handicap ?? false,
    droit_image: adherent?.droit_image ?? true,
    fiche_renseignement: adherent?.fiche_renseignement ?? false,
    paiement_global: adherent?.paiement_global ?? false,
    manque_paiement: adherent?.manque_paiement ?? true,
    manque_yeps: adherent?.manque_yeps ?? false,
    manque_passport: adherent?.manque_passport ?? false,
    maillot: adherent?.maillot ?? false,
    taille_maillot: adherent?.taille_maillot ?? '',
    maillot_recupere: adherent?.maillot_recupere ?? false,
    flocage: adherent?.flocage ?? false,
    texte_flocage: adherent?.texte_flocage ?? '',
    short: adherent?.short ?? false,
    taille_short: adherent?.taille_short ?? '',
    short_recupere: adherent?.short_recupere ?? false,
  }));
  const [form, setForm] = useState(formInitial);

  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [confirmationAbandon, setConfirmationAbandon] = useState(false);
  const titreId = useId();

  const modifie = JSON.stringify(form) !== JSON.stringify(formInitial);

  // Échap, clic à côté ou « Annuler » : on demande confirmation avant de
  // perdre une saisie non enregistrée.
  function demanderFermeture() {
    if (enCours || suppression) return;
    if (modifie) setConfirmationAbandon(true);
    else onClose();
  }

  // 🥨 Easter egg 67
  const deptRef = useRef(null);
  const [easterEgg67, setEasterEgg67] = useState(false);
  const easterEgg67Triggered = useRef(false);

  useEffect(() => {
    if (form.dept_naissance.trim() === '67' && !easterEgg67Triggered.current) {
      easterEgg67Triggered.current = true;
      setEasterEgg67(true);
      const timer = setTimeout(() => {
        setEasterEgg67(false);
        easterEgg67Triggered.current = false;
      }, 10000);
      return () => clearTimeout(timer);
    }
    if (form.dept_naissance.trim() !== '67') {
      easterEgg67Triggered.current = false;
    }
  }, [form.dept_naissance]);

  function set(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  function toggleLicence(type) {
    setForm((f) => {
      const inclus = f.types_licence.includes(type);
      const nouveauxTypes = inclus
        ? f.types_licence.filter((t) => t !== type)
        : [...f.types_licence, type];
      const updates = { types_licence: nouveauxTypes };
      if (type === 'Encadrant') updates.est_responsable_as = !inclus;
      return { ...f, ...updates };
    });
  }

  const apercu = calculerStatutLicence(form);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);

    if (!form.nom.trim() || !form.prenom.trim()) {
      setErreur('Le nom et le prénom sont obligatoires.');
      setOnglet('infos');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setErreur("L'adresse e-mail n'est pas valide.");
      setOnglet('infos');
      return;
    }

    const donnees = {
      nom: reparerTexte(form.nom).trim(),
      prenom: reparerTexte(form.prenom).trim(),
      email: form.email.trim().toLowerCase() || null,
      telephone: form.telephone.trim() || null,
      sexe: form.sexe || null,
      annee_etude: form.annee_etude.trim() || null,
      date_naissance: form.date_naissance.trim() || null,
      pays_naissance: form.pays_naissance.trim() || null,
      dept_naissance: form.dept_naissance.trim() || null,
      ville_naissance: form.ville_naissance.trim() || null,
      adresse: form.adresse.trim() || null,
      code_postal: form.code_postal.trim() || null,
      ville: form.ville.trim() || null,
      types_licence: form.types_licence.length > 0 ? form.types_licence : null,
      est_responsable_as: form.est_responsable_as,
      adherent_bde: form.adherent_bde,
      licence_ffsu_a_jour: form.licence_ffsu_a_jour,
      questionnaire_sante_ok: form.questionnaire_sante_ok,
      activite_contraintes: form.activite_contraintes,
      situation_handicap: form.situation_handicap,
      droit_image: form.droit_image,
      fiche_renseignement: form.fiche_renseignement,
      paiement_global: form.paiement_global,
      manque_paiement: form.paiement_global ? false : form.manque_paiement,
      manque_yeps: form.paiement_global ? false : form.manque_yeps,
      manque_passport: form.paiement_global ? false : form.manque_passport,
      // Un article décoché efface sa taille et sa remise ; le flocage est une
      // option du maillot, il disparaît avec lui.
      maillot: form.maillot,
      taille_maillot: form.maillot ? form.taille_maillot || null : null,
      maillot_recupere: form.maillot && form.maillot_recupere,
      flocage: form.maillot && form.flocage,
      texte_flocage: form.maillot && form.flocage ? form.texte_flocage.trim() || null : null,
      short: form.short,
      taille_short: form.short ? form.taille_short || null : null,
      short_recupere: form.short && form.short_recupere,
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
    if (error) { setErreur('Suppression impossible : ' + error.message); return; }
    onDeleted(adherent.id);
  }

  return (
    <Modal onClose={demanderFermeture} labelledBy={titreId} className="editor editor--large">
      <form className="editor__form" onSubmit={enregistrer}>
        {/* Contenu qui défile ; les boutons restent fixés en bas de la fenêtre. */}
        <div className="editor__corps">
          <h3 id={titreId}>{creation ? 'Nouvel adhérent' : nomComplet(adherent)}</h3>

          {/* Sélecteur d'onglets */}
          <div className="editor-tabs" role="tablist" aria-label="Sections de la fiche">
            <button
              type="button"
              role="tab"
              aria-selected={onglet === 'licence'}
              className={`editor-tab${onglet === 'licence' ? ' editor-tab--active' : ''}`}
              onClick={() => setOnglet('licence')}
            >
              Licence
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onglet === 'infos'}
              className={`editor-tab${onglet === 'infos' ? ' editor-tab--active' : ''}`}
              onClick={() => setOnglet('infos')}
            >
              Informations personnelles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onglet === 'merch'}
              className={`editor-tab${onglet === 'merch' ? ' editor-tab--active' : ''}`}
              onClick={() => setOnglet('merch')}
            >
              Merch
            </button>
          </div>

          {/* Onglet Licence */}
          {onglet === 'licence' && (
            <div>
              <label className="check">
                <input type="checkbox" checked={form.questionnaire_sante_ok}
                       onChange={(e) => set('questionnaire_sante_ok', e.target.checked)} />
                Questionnaire santé OK
              </label>

              <label className="check">
                <input type="checkbox" checked={form.paiement_global}
                       onChange={(e) => set('paiement_global', e.target.checked)} />
                Paiement global à jour
              </label>

              {!form.paiement_global && (
                <fieldset className="manques">
                  <legend>Ce qu'il manque :</legend>
                  <label className="check">
                    <input type="checkbox" checked={form.manque_paiement}
                           onChange={(e) => set('manque_paiement', e.target.checked)} />
                    Paiement
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={form.manque_yeps}
                           onChange={(e) => set('manque_yeps', e.target.checked)} />
                    Aide YEPS (QR code et numéro)
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={form.manque_passport}
                           onChange={(e) => set('manque_passport', e.target.checked)} />
                    Aide PASS'SPORT
                  </label>
                </fieldset>
              )}

              <div className={`apercu ${apercu.valide ? 'apercu--ok' : 'apercu--ko'}`}>
                Statut résultant : <strong>{apercu.valide ? 'À jour' : 'Non à jour'}</strong>
              </div>
            </div>
          )}

          {/* Onglet Informations personnelles */}
          {onglet === 'infos' && (
            <div>
              {/* Identité */}
              <p className="editor-section-title">Identité</p>
              <div className="editor-grid editor-grid--3">
                <label>Prénom<input type="text" maxLength={100} value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></label>
                <label>Nom<input type="text" maxLength={100} value={form.nom} onChange={(e) => set('nom', e.target.value)} /></label>
                <label>Sexe
                  <select value={form.sexe} onChange={(e) => set('sexe', e.target.value)}>
                    <option value="">—</option>
                    <option value="H">H</option>
                    <option value="F">F</option>
                  </select>
                </label>
                <label>E-mail<input type="email" maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
                <label>Téléphone<input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></label>
                <label>Année d'étude<input type="text" placeholder="ex. 3A étudiant" value={form.annee_etude} onChange={(e) => set('annee_etude', e.target.value)} /></label>
                <label>Date de naissance<input type="text" placeholder="ex. 16/07/2005" value={form.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} /></label>
                <label>Pays de naissance<input type="text" value={form.pays_naissance} onChange={(e) => set('pays_naissance', e.target.value)} /></label>
                <label>Dept. naissance<input ref={deptRef} type="text" placeholder="ex. 45" value={form.dept_naissance} onChange={(e) => set('dept_naissance', e.target.value)} className={easterEgg67 ? 'easter-egg-67' : ''} /></label>
                <label className="editor-grid__span2">Ville de naissance<input type="text" value={form.ville_naissance} onChange={(e) => set('ville_naissance', e.target.value)} /></label>
              </div>

              {/* Adresse */}
              <p className="editor-section-title">Adresse</p>
              <label>Adresse<input type="text" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></label>
              <div className="editor-grid">
                <label>Code postal<input type="text" inputMode="numeric" value={form.code_postal} onChange={(e) => set('code_postal', e.target.value)} /></label>
                <label>Ville<input type="text" value={form.ville} onChange={(e) => set('ville', e.target.value)} /></label>
              </div>

              {/* Types de licence */}
              <p className="editor-section-title">Types de licence</p>
              <div className="editor-checks-row">
                {TYPES_LICENCE.map((type) => (
                  <label key={type} className="check check--inline">
                    <input
                      type="checkbox"
                      checked={form.types_licence.includes(type)}
                      onChange={() => toggleLicence(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>

              {/* Rôle */}
              <p className="editor-section-title">Rôle</p>
              <div className="editor-checks-row">
                <label className="check check--inline">
                  <input
                    type="checkbox"
                    checked={form.est_responsable_as}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((f) => ({
                        ...f,
                        est_responsable_as: checked,
                        types_licence: checked
                          ? f.types_licence.includes('Encadrant') ? f.types_licence : [...f.types_licence, 'Encadrant']
                          : f.types_licence.filter((t) => t !== 'Encadrant'),
                      }));
                    }}
                  />
                  Respo AS
                </label>
                <label className="check check--inline">
                  <input type="checkbox" checked={form.adherent_bde} onChange={(e) => set('adherent_bde', e.target.checked)} />
                  Adhérent BDE
                </label>
                <label className="check check--inline">
                  <input type="checkbox" checked={form.licence_ffsu_a_jour} onChange={(e) => set('licence_ffsu_a_jour', e.target.checked)} />
                  Licence FFSU
                </label>
              </div>

              {/* Médical et autres */}
              <p className="editor-section-title">Médical et autres</p>
              <div className="editor-checks-row">
                <label className="check check--inline">
                  <input type="checkbox" checked={form.activite_contraintes} onChange={(e) => set('activite_contraintes', e.target.checked)} />
                  Activité à contraintes
                </label>
              </div>
              <div className="editor-checks-row" style={{ marginTop: 8 }}>
                <label className="check check--inline">
                  <input type="checkbox" checked={form.situation_handicap} onChange={(e) => set('situation_handicap', e.target.checked)} />
                  Situation de handicap
                </label>
                <label className="check check--inline">
                  <input type="checkbox" checked={form.droit_image} onChange={(e) => set('droit_image', e.target.checked)} />
                  Droit à l'image autorisé
                </label>
              </div>
            </div>
          )}

          {/* Onglet Merch */}
          {onglet === 'merch' && (
            <div className="merch">
              <fieldset className="merch-article">
                <legend>Maillot</legend>
                <label className="check">
                  <input type="checkbox" checked={form.maillot} onChange={(e) => set('maillot', e.target.checked)} />
                  Maillot commandé
                </label>
                {form.maillot && (
                  <div className="merch-article__details">
                    <label>
                      Taille du maillot
                      <select value={form.taille_maillot} onChange={(e) => set('taille_maillot', e.target.value)}>
                        <option value="">Non précisée</option>
                        {optionsTaille(form.taille_maillot).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={form.maillot_recupere} onChange={(e) => set('maillot_recupere', e.target.checked)} />
                      Maillot récupéré
                    </label>
                  </div>
                )}

                {/* Le flocage est une option du maillot : remis avec lui. */}
                {form.maillot && (
                  <div className="merch-article__option">
                    <label className="check">
                      <input type="checkbox" checked={form.flocage} onChange={(e) => set('flocage', e.target.checked)} />
                      Flocage (nom au dos)
                    </label>
                    {form.flocage && (
                      <label className="merch-article__texte">
                        Texte floqué
                        <input
                          type="text"
                          maxLength={LONGUEUR_MAX_FLOCAGE}
                          placeholder="ex. DUPONT"
                          value={form.texte_flocage}
                          onChange={(e) => set('texte_flocage', e.target.value)}
                        />
                        <span className="merch-article__aide">{LONGUEUR_MAX_FLOCAGE} caractères maximum</span>
                      </label>
                    )}
                  </div>
                )}
              </fieldset>

              <fieldset className="merch-article">
                <legend>Short</legend>
                <label className="check">
                  <input type="checkbox" checked={form.short} onChange={(e) => set('short', e.target.checked)} />
                  Short commandé
                </label>
                {form.short && (
                  <div className="merch-article__details">
                    <label>
                      Taille du short
                      <select value={form.taille_short} onChange={(e) => set('taille_short', e.target.value)}>
                        <option value="">Non précisée</option>
                        {optionsTaille(form.taille_short).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={form.short_recupere} onChange={(e) => set('short_recupere', e.target.checked)} />
                      Short récupéré
                    </label>
                  </div>
                )}
              </fieldset>
            </div>
          )}

          {!creation && (
            <div className="editor-danger">
              <button
                type="button"
                className="btn-danger-ghost"
                onClick={() => setConfirmationSuppression(true)}
                disabled={suppression}
              >
                {suppression ? 'Suppression…' : 'Supprimer cet adhérent'}
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions editor__pied">
          {erreur && <p className="error editor__erreur" role="alert">{erreur}</p>}
          <button type="button" className="btn-ghost" onClick={demanderFermeture}>Annuler</button>
          <button type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : creation ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </form>

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

      {confirmationAbandon && (
        <ConfirmDialog
          title="Abandonner les modifications ?"
          message="Les changements non enregistrés de cette fiche seront perdus."
          confirmLabel="Abandonner"
          cancelLabel="Continuer la saisie"
          onCancel={() => setConfirmationAbandon(false)}
          onConfirm={onClose}
        />
      )}
    </Modal>
  );
}
