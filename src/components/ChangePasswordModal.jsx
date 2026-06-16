import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { verifierRegles, validerMotDePasse } from '../lib/passwordPolicy';

/**
 * Modal de changement de mot de passe.
 *
 * Props :
 *  - onClose()  : fermer la modal
 *  - target     : 'self' (bureau modifie son propre mdp) | 'coach' (bureau modifie le mdp d'un coach)
 */
export default function ChangePasswordModal({ onClose, target = 'self' }) {
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState(null);
  const [ok, setOk] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Mode coach : liste des coachs et sélection
  const [coachs, setCoachs] = useState([]);
  const [coachId, setCoachId] = useState('');
  const [chargementCoachs, setChargementCoachs] = useState(target === 'coach');

  // Charger la liste des coachs si mode coach
  useEffect(() => {
    if (target !== 'coach') return;

    async function chargerCoachs() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom, role')
        .eq('role', 'coach')
        .order('nom');

      if (!error && data) {
        setCoachs(data);
        if (data.length === 1) setCoachId(data[0].id);
      }
      setChargementCoachs(false);
    }

    chargerCoachs();
  }, [target]);

  const regles = verifierRegles(mdp);
  const toutOk = regles.every((r) => r.ok);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);

    // Vérification côté client
    const errMdp = validerMotDePasse(mdp);
    if (errMdp) {
      setErreur(errMdp);
      return;
    }
    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (target === 'coach' && !coachId) {
      setErreur('Veuillez sélectionner un coach.');
      return;
    }

    setEnCours(true);

    if (target === 'self') {
      // Bureau modifie son propre mot de passe
      const { error } = await supabase.auth.updateUser({ password: mdp });
      setEnCours(false);

      if (error) {
        setErreur('Modification impossible : ' + error.message);
        return;
      }
    } else {
      // Bureau modifie le mdp d'un coach via l'API serverless
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
    ? 'Modifier le mot de passe d\u2019un coach'
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
            {/* Sélecteur de coach (mode coach uniquement) */}
            {target === 'coach' && (
              <label className="champ">
                Compte coach
                {chargementCoachs ? (
                  <p className="muted" style={{ margin: '4px 0' }}>Chargement…</p>
                ) : coachs.length === 0 ? (
                  <p className="error" style={{ margin: '4px 0' }}>Aucun compte coach trouvé.</p>
                ) : (
                  <select
                    className="coach-select"
                    value={coachId}
                    onChange={(e) => setCoachId(e.target.value)}
                    required
                  >
                    <option value="">— Sélectionner un coach —</option>
                    {coachs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom ?? ''} {c.nom ?? ''} (coach)
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )}

            <label className="champ">
              Nouveau mot de passe
              <input
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {/* Checklist de validation en temps réel */}
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
              <button type="submit" disabled={enCours || !toutOk || mdp !== confirme || (target === 'coach' && !coachId)}>
                {enCours ? 'Modification…' : 'Valider'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
