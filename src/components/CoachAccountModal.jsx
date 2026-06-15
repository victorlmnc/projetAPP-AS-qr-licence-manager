import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DOMAINE_LOGIN = 'as-licences.fr';

function normaliserLogin(login) {
  const valeur = login.trim();
  if (!valeur) return '';
  return valeur.includes('@') ? valeur.split('@')[0].trim() : valeur;
}

export default function CoachAccountModal({ onClose }) {
  const [coachs, setCoachs] = useState([]);
  const [selection, setSelection] = useState('');
  const [form, setForm] = useState({ login: '', password: '', nom: '', prenom: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    chargerCoachs();
  }, []);

  async function chargerCoachs(coachIdVoulu = selection) {
    setLoading(true);
    setErreur(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, login, nom, prenom')
      .eq('role', 'coach')
      .order('nom', { ascending: true });

    setLoading(false);
    if (error) {
      setErreur('Chargement des coachs impossible : ' + error.message);
      return;
    }

    const liste = data ?? [];
    setCoachs(liste);
    if (liste.length) {
      choisirCoach(liste.find((coach) => coach.id === coachIdVoulu) ?? liste[0]);
    }
  }

  function choisirCoach(coach) {
    setSelection(coach.id);
    setMessage(null);
    setErreur(null);
    setForm({
      login: coach.login ?? '',
      password: '',
      nom: coach.nom ?? '',
      prenom: coach.prenom ?? '',
    });
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    if (!selection) {
      setErreur('Selectionnez un coach.');
      return;
    }

    const login = normaliserLogin(form.login);
    if (!login) {
      setErreur('Le login est obligatoire.');
      return;
    }

    if (form.password && form.password.length < 8) {
      setErreur('Le nouveau mot de passe doit faire au moins 8 caracteres.');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke('update-coach-account', {
      body: {
        coachId: selection,
        login,
        password: form.password || null,
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
      },
    });
    setSaving(false);

    if (error) {
      const reponse = await error.context?.json?.().catch(() => null);
      setErreur(reponse?.error || error.message || 'Modification impossible.');
      return;
    }
    if (data?.error) {
      setErreur(data.error);
      return;
    }

    setMessage('Compte coach mis a jour.');
    setForm((f) => ({ ...f, password: '' }));
    await chargerCoachs(selection);
  }

  const coachActif = coachs.find((coach) => coach.id === selection);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="editor coach-account" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={enregistrer}>
          <h3>Compte coach</h3>
          <p className="muted small">
            Le Bureau peut modifier le login et definir un nouveau mot de passe pour un coach.
          </p>

          {loading && <p>Chargement...</p>}
          {erreur && <p className="error">{erreur}</p>}
          {message && <p className="apercu apercu--ok">{message}</p>}

          {!loading && coachs.length === 0 && (
            <p className="muted">Aucun compte coach trouve dans profiles.</p>
          )}

          {coachs.length > 0 && (
            <>
              <label>
                Coach
                <select
                  value={selection}
                  onChange={(e) => {
                    const coach = coachs.find((item) => item.id === e.target.value);
                    if (coach) choisirCoach(coach);
                  }}
                >
                  {coachs.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {(coach.prenom || coach.nom)
                        ? `${coach.prenom ?? ''} ${coach.nom ?? ''}`.trim()
                        : coach.login || coach.id}
                    </option>
                  ))}
                </select>
              </label>

              <div className="coach-account__hint">
                <span>Connexion actuelle</span>
                <strong>{coachActif?.login ? `${coachActif.login}@${DOMAINE_LOGIN}` : 'Login non renseigne'}</strong>
              </div>

              <label>
                Login
                <div className="input-suffix">
                  <input
                    type="text"
                    value={form.login}
                    onChange={(e) => setForm((f) => ({ ...f, login: normaliserLogin(e.target.value) }))}
                    placeholder="coach"
                    required
                  />
                  <span>@{DOMAINE_LOGIN}</span>
                </div>
              </label>

              <div className="editor-grid">
                <label>
                  Prenom
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  />
                </label>
                <label>
                  Nom
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  />
                </label>
              </div>

              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Laisser vide pour ne pas changer"
                  autoComplete="new-password"
                />
              </label>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Fermer</button>
            <button type="submit" disabled={saving || loading || coachs.length === 0}>
              {saving ? 'Modification...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
