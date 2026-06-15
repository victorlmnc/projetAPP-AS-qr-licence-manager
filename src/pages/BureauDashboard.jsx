import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import './BureauDashboard.css';

const FILTRES = [
  { cle: 'tous',       libelle: 'Tous',              test: () => true },
  { cle: 'a_jour',     libelle: 'À jour',            test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non à jour',        test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche',      libelle: 'Fiche manquante',   test: (a) => !a.fiche_renseignement },
  { cle: 'yeps',       libelle: 'Manque YEPS',       test: (a) => a.manque_yeps },
  { cle: 'passsport',  libelle: "Manque PASS'SPORT", test: (a) => a.manque_passsport },
  { cle: 'paiement',   libelle: 'Manque paiement',   test: (a) => a.manque_paiement },
];

export default function BureauDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('adherents'); // 'adherents' | 'utilisateurs'

  // Adhérents State
  const [adherents, setAdherents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);

  // Utilisateurs State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ login: '', password: '', role: 'coach', adherent_id: '', nom: '', prenom: '' });

  // Destruction State
  const [showDestroyModal, setShowDestroyModal] = useState(false);
  const [destroyKey, setDestroyKey] = useState('');
  const [destroyError, setDestroyError] = useState(null);
  const [destroyLoading, setDestroyLoading] = useState(false);

  // Charger les adhérents
  useEffect(() => {
    chargerAdherents();
  }, []);

  // Charger les utilisateurs si l'onglet change
  useEffect(() => {
    if (activeTab === 'utilisateurs') {
      chargerUtilisateurs();
    }
  }, [activeTab]);

  async function chargerAdherents() {
    setChargement(true);
    try {
      const data = await api.getAdherents();
      setAdherents(data);
    } catch (error) {
      setErreur('Chargement impossible : ' + error.message);
    } finally {
      setChargement(false);
    }
  }

  async function chargerUtilisateurs() {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      setUserError('Impossible de charger les utilisateurs : ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  // Filtrage des adhérents
  const listeAdherents = useMemo(() => {
    const f = FILTRES.find((x) => x.cle === filtre) ?? FILTRES[0];
    const q = recherche.trim().toLowerCase();
    return adherents
      .filter(f.test)
      .filter((a) =>
        !q ||
        a.nom.toLowerCase().includes(q) ||
        a.prenom.toLowerCase().includes(q)
      );
  }, [adherents, filtre, recherche]);

  function onSaved(adherent) {
    setAdherents((prev) => {
      const existe = prev.some((a) => a.id === adherent.id);
      const maj = existe
        ? prev.map((a) => (a.id === adherent.id ? adherent : a))
        : [...prev, adherent];
      return maj.sort((a, b) => a.nom.localeCompare(b.nom));
    });
    setEditeur(null);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setUserError(null);

    // Si un adhérent est lié, on extrait nom et prénom de celui-ci
    let nom = userForm.nom;
    let prenom = userForm.prenom;
    if (userForm.adherent_id) {
      const target = adherents.find(a => a.id === userForm.adherent_id);
      if (target) {
        nom = target.nom;
        prenom = target.prenom;
      }
    }

    try {
      const newUser = await api.createUser({
        login: userForm.login,
        password: userForm.password,
        role: userForm.role,
        adherent_id: userForm.adherent_id || null,
        nom,
        prenom
      });
      
      setUsers(prev => [...prev, newUser]);
      setShowAddUser(false);
      setUserForm({ login: '', password: '', role: 'coach', adherent_id: '', nom: '', prenom: '' });
      alert('Utilisateur créé avec succès !');
    } catch (error) {
      setUserError(error.message || 'Erreur lors de la création.');
    }
  }

  async function handleDestroyDB(e) {
    e.preventDefault();
    setDestroyError(null);
    setDestroyLoading(true);

    try {
      await api.destroyDatabase(destroyKey);
      alert('La base de données a été détruite avec succès.');
      setShowDestroyModal(false);
      await signOut();
      navigate('/login');
    } catch (error) {
      setDestroyError(error.message || 'Clé incorrecte.');
    } finally {
      setDestroyLoading(false);
    }
  }

  return (
    <div className="page">
      <Header titre="Espace Bureau" />

      {/* Onglets principaux */}
      <div className="container" style={{ marginTop: '20px' }}>
        <div className="chips" style={{ borderBottom: '2px solid var(--line)', paddingBottom: '10px' }}>
          <button
            className={`chip ${activeTab === 'adherents' ? 'chip--on' : ''}`}
            onClick={() => setActiveTab('adherents')}
          >
            Adhérents ({adherents.length})
          </button>
          <button
            className={`chip ${activeTab === 'utilisateurs' ? 'chip--on' : ''}`}
            onClick={() => setActiveTab('utilisateurs')}
          >
            Utilisateurs ({users.length})
          </button>
        </div>
      </div>

      {activeTab === 'adherents' ? (
        <main className="container dash">
          <div className="dash-top">
            <h2>Adhérents <span className="muted">({adherents.length})</span></h2>
            <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adhérent</button>
          </div>

          <input
            className="dash-search"
            placeholder="Rechercher un nom ou un prénom…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />

          <div className="chips">
            {FILTRES.map((f) => (
              <button
                key={f.cle}
                className={`chip ${filtre === f.cle ? 'chip--on' : ''}`}
                onClick={() => setFiltre(f.cle)}
              >
                {f.libelle}
              </button>
            ))}
          </div>

          {chargement && <p>Chargement…</p>}
          {erreur && <p className="error">{erreur}</p>}

          {!chargement && !erreur && (
            listeAdherents.length === 0 ? (
              <p className="muted dash-empty">Aucun adhérent ne correspond.</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Statut</th>
                      <th>Détail</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listeAdherents.map((a) => {
                      const { valide, anomalies } = calculerStatutLicence(a);
                      return (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.prenom} {a.nom}</strong>
                            {a.email && <div className="muted small">{a.email}</div>}
                          </td>
                          <td><StatusBadge adherent={a} /></td>
                          <td className="small">{valide ? '—' : anomalies.join(' · ')}</td>
                          <td className="dash-row-actions">
                            <button className="btn-ghost" onClick={() => setEditeur({ adherent: a })}>
                              Modifier
                            </button>
                            <button className="btn-ghost" onClick={() => setQrAdherent(a)}>
                              QR Code
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </main>
      ) : (
        <main className="container dash">
          <div className="dash-top">
            <h2>Comptes Utilisateurs <span className="muted">({users.length})</span></h2>
            <button onClick={() => setShowAddUser(true)}>+ Nouvel utilisateur</button>
          </div>

          {loadingUsers && <p>Chargement des utilisateurs…</p>}
          {userError && <p className="error">{userError}</p>}

          {!loadingUsers && !userError && (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Identifiant (login)</th>
                    <th>Nom affiché</th>
                    <th>Rôle</th>
                    <th>ID Adhérent lié</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.login}</strong></td>
                      <td>{u.prenom || ''} {u.nom || ''}</td>
                      <td>
                        <span className={`badge badge--${u.role === 'bureau' ? 'vert' : u.role === 'coach' ? 'orange' : 'gris'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="small muted">{u.adherent_id || 'Aucun'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* Zone de danger pour détruire la base (Visible par l'admin principal) */}
      <footer className="container" style={{ marginTop: '40px', padding: '20px', borderTop: '2px dashed #f5c2c2', backgroundColor: '#fff7f7', borderRadius: 'var(--radius)', marginBottom: '40px' }}>
        <h4 style={{ color: 'var(--ko)', margin: '0 0 10px 0' }}>Zone de Danger</h4>
        <p className="small muted" style={{ margin: '0 0 15px 0' }}>
          La réinitialisation supprimera définitivement tous les adhérents, tous les comptes utilisateurs, et vous déconnectera. 
          Vous devrez ré-initialiser le compte administrateur principal à l'aide de votre clé fixe de 40 caractères.
        </p>
        <button 
          onClick={() => { setShowDestroyModal(true); setDestroyError(null); setDestroyKey(''); }} 
          style={{ backgroundColor: 'var(--ko)', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}
        >
          Détruire la base de données
        </button>
      </footer>

      {/* Modal - Editeur Adhérent */}
      {editeur && (
        <AdherentEditor
          adherent={editeur.adherent}
          onClose={() => setEditeur(null)}
          onSaved={onSaved}
        />
      )}

      {/* Modal - QR Code */}
      {qrAdherent && (
        <QrCodeModal adherent={qrAdherent} onClose={() => setQrAdherent(null)} />
      )}

      {/* Modal - Nouvel Utilisateur */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <aside className="editor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <form onSubmit={handleAddUser}>
              <h3>Créer un utilisateur</h3>
              <p className="muted small">Seul l'administrateur peut créer des comptes pour les coachs ou adhérents.</p>

              <label>
                Identifiant (login)
                <input
                  type="text"
                  value={userForm.login}
                  onChange={(e) => setUserForm(f => ({ ...f, login: e.target.value }))}
                  required
                />
              </label>

              <label>
                Mot de passe
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </label>

              <label>
                Rôle
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}
                >
                  <option value="coach">Coach</option>
                  <option value="adherent">Adhérent</option>
                  <option value="bureau">Bureau (Admin)</option>
                </select>
              </label>

              <label>
                Lier à un adhérent existant (facultatif)
                <select
                  value={userForm.adherent_id}
                  onChange={(e) => setUserForm(f => ({ ...f, adherent_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)' }}
                >
                  <option value="">-- Ne lier à aucun --</option>
                  {adherents.map(a => (
                    <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                  ))}
                </select>
              </label>

              {/* Si aucun adhérent n'est lié, on demande un nom/prénom pour l'affichage */}
              {!userForm.adherent_id && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>
                    Prénom
                    <input
                      type="text"
                      value={userForm.prenom}
                      onChange={(e) => setUserForm(f => ({ ...f, prenom: e.target.value }))}
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      type="text"
                      value={userForm.nom}
                      onChange={(e) => setUserForm(f => ({ ...f, nom: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              {userError && <p className="error">{userError}</p>}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddUser(false)}>Annuler</button>
                <button type="submit">Créer le compte</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Modal - Destruction de la base */}
      {showDestroyModal && (
        <div className="modal-overlay" onClick={() => setShowDestroyModal(false)}>
          <aside className="editor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <form onSubmit={handleDestroyDB}>
              <h3 style={{ color: 'var(--ko)' }}>Confirmer la Destruction</h3>
              <p className="muted small">Cette action est irréversible. Pour confirmer le nettoyage complet, veuillez saisir la clé d'activation fixe de 40 caractères.</p>

              <label>
                Clé de sécurité (40 caractères)
                <input
                  type="password"
                  maxLength={40}
                  value={destroyKey}
                  onChange={(e) => setDestroyKey(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace' }}
                />
              </label>

              {destroyError && <p className="error">{destroyError}</p>}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowDestroyModal(false)}>Annuler</button>
                <button type="submit" disabled={destroyLoading} style={{ backgroundColor: 'var(--ko)', color: 'white' }}>
                  {destroyLoading ? 'Destruction…' : 'Valider la Destruction'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
