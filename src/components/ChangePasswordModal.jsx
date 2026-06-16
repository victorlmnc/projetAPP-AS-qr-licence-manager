import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { verifierRegles, validerMotDePasse } from '../lib/passwordPolicy';

/**
 * Modal de changement de mot de passe.
 *
 * Props :
 *  - onClose()  : fermer la modal
 *  - target     : 'self' (bureau modifie son propre mdp) | 'coach' (bureau modifie le mdp du Responsable Sport)
 */
export default function ChangePasswordModal({ onClose, target = 'self' }) {
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState(null);
  const [ok, setOk] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Mode coach : identifiant du compte Responsable Sport unique
  const [coachId, setCoachId] = useState(null);
  const [coachNom, setCoachNom] = useState('');
  const [chargementCoach, setChargementCoach] = useState(target === 'coach');

  // Charger le compte Responsable Sport unique
  useEffect(() => {
    if (target !== 'coach') return;

    async function chargerCoach() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .eq('role', 'coach')
        .limit(1)
        .single();

      if (!error && data) {
        setCoachId(data.id);
        setCoachNom(`${data.prenom ?? ''} ${data.nom ?? ''}`.trim() || 'Responsable Sport');
      } else {
        setErreur('Aucun compte Responsable Sport trouvé.');
      }
      setChargementCoach(false);
    }

    chargerCoach();
  }, [target]);

  const regles = verifierRegles(mdp);
  const toutOk = regles.every((r) => r.ok);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);

    const errMdp = validerMotDePasse(mdp);
    if (errMdp) {
      setErreur(errMdp);
      return;
    }
    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);

    if (target === 'self') {
      const { error } = await supabase.auth.updateUser({ password: mdp });
      setEnCours(false);

      if (error) {
        setErreur('Modification impossible : ' + error.message);
        return;
      }
    } else {
      if (!coachId) {
        setErreur('Compte Responsable Sport introuvable.');
        setEnCours(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      try {
        const res = await fetch('/api/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ targetUserId: coachId, newPassword: mdp }),
        });

        const data = await res.json();
        setEnCours(false);

        if (!res.ok) {
          setErreur(data.error || 'Erreur inconnue.');
          return;
        }
      } catch (err) {
        setEnCours(false);
        setErreur('Erreur réseau : ' + err.message);
        return;
      }
    }

    setOk(true);
    setMdp('');
    setConfirme('');
  }

  const titre = target === 'coach'
    ? 'Modifier le mot de passe du Responsable Sport'
    : 'Changer mon mot de passe';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{titre}</h3>

        {ok ? (
          <>
            <p className="apercu apercu--ok">Mot de passe modifié avec succès.</p>
            <div className="modal-actions">
              <button onClick={onClose}>Fermer</button>
            </div>
          </>
        ) : (
          <form onSubmit={valider}>
            {/* Affichage du compte ciblé */}
            <div className="coach-target-info">
              {target === 'self' ? (
                <p className="coach-target-label">
                  Compte ciblé : <strong>Bureau</strong>
                </p>
              ) : target === 'coach' ? (
                chargementCoach ? (
                  <p className="muted">Chargement du compte Responsable Sport…</p>
                ) : coachId ? (
                  <p className="coach-target-label">
                    Compte ciblé : <strong>{coachNom}</strong>
                  </p>
                ) : null
              ) : null}
            </div>

            <label className="champ">
              Nouveau mot de passe
              <input
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {mdp.length > 0 && (
              <ul className="pwd-rules">
                {regles.map((r) => (
                  <li key={r.cle} className={`pwd-rule ${r.ok ? 'pwd-rule--ok' : 'pwd-rule--ko'}`}>
                    <span className="pwd-rule__icon">{r.ok ? '✓' : '✗'}</span>
                    {r.libelle}
                  </li>
                ))}
              </ul>
            )}

            <label className="champ">
              Confirmer le mot de passe
              <input
                type="password"
                value={confirme}
                onChange={(e) => setConfirme(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {confirme.length > 0 && mdp !== confirme && (
              <p className="pwd-rule pwd-rule--ko" style={{ marginTop: 6 }}>
                <span className="pwd-rule__icon">✗</span>
                Les mots de passe ne correspondent pas
              </p>
            )}

            {erreur && <p className="error">{erreur}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
              <button
                type="submit"
                disabled={enCours || !toutOk || mdp !== confirme || (target === 'coach' && !coachId)}
              >
                {enCours ? 'Modification…' : 'Valider'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
