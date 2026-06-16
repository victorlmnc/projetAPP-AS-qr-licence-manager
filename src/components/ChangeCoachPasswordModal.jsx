import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

function coachLabel(coach) {
  const nomComplet = [coach.prenom, coach.nom].filter(Boolean).join(' ').trim();
  return nomComplet || `Coach ${coach.id.slice(0, 8)}`;
}

export default function ChangeCoachPasswordModal({ onClose }) {
  const [coaches, setCoaches] = useState([]);
  const [coachId, setCoachId] = useState('');
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [ok, setOk] = useState(false);

  const coachSelectionne = useMemo(
    () => coaches.find((coach) => coach.id === coachId),
    [coaches, coachId]
  );

  useEffect(() => {
    let actif = true;

    async function chargerCoaches() {
      setErreur(null);
      setChargement(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .eq('role', 'coach')
        .order('nom', { ascending: true });

      if (!actif) return;

      if (error) {
        setErreur('Impossible de charger les comptes coach : ' + error.message);
        setCoaches([]);
        setCoachId('');
      } else {
        const liste = data ?? [];
        setCoaches(liste);
        setCoachId(liste[0]?.id ?? '');
      }

      setChargement(false);
    }

    chargerCoaches();

    return () => {
      actif = false;
    };
  }, []);

  async function valider(e) {
    e.preventDefault();
    setErreur(null);
    setOk(false);

    if (!coachId) {
      setErreur('Choisis un compte coach.');
      return;
    }
    if (mdp.length < 8) {
      setErreur('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (mdp !== confirme) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      setEnCours(false);
      setErreur('Session expirée. Reconnecte-toi au compte bureau.');
      return;
    }

    let reponse;
    try {
      reponse = await fetch('/api/change-coach-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coachId, password: mdp }),
      });
    } catch {
      setEnCours(false);
      setErreur('API indisponible. En local, lance le projet avec Vercel Dev ou teste cette action sur le site déployé.');
      return;
    }

    const contentType = reponse.headers.get('content-type') || '';
    const resultat = contentType.includes('application/json')
      ? await reponse.json().catch(() => ({}))
      : {};
    setEnCours(false);

    if (!reponse.ok) {
      if (reponse.status === 404 && !resultat.error) {
        setErreur('API introuvable. Avec npm run dev, Vite ne lance pas les routes /api Vercel.');
      } else {
        setErreur(resultat.error || `Modification impossible. Code erreur : ${reponse.status}.`);
      }
      return;
    }

    setOk(true);
    setMdp('');
    setConfirme('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Modifier le mot de passe coach</h3>

        {ok && (
          <p className="apercu apercu--ok">
            Mot de passe modifié pour {coachSelectionne ? coachLabel(coachSelectionne) : 'le coach'}.
          </p>
        )}

        <form onSubmit={valider}>
          <label className="champ">
            Compte coach
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              disabled={chargement || enCours || coaches.length === 0}
            >
              {chargement ? (
                <option>Chargement...</option>
              ) : coaches.length === 0 ? (
                <option>Aucun coach trouvé</option>
              ) : (
                coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coachLabel(coach)}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="champ">
            Nouveau mot de passe
            <input
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              autoComplete="new-password"
              disabled={enCours}
            />
          </label>

          <label className="champ">
            Confirmer le mot de passe
            <input
              type="password"
              value={confirme}
              onChange={(e) => setConfirme(e.target.value)}
              autoComplete="new-password"
              disabled={enCours}
            />
          </label>

          {erreur && <p className="error">{erreur}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={enCours || chargement || coaches.length === 0}>
              {enCours ? 'Modification...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
