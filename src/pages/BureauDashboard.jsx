import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import ImportCsvModal from '../components/ImportCsvModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import './BureauDashboard.css';

const FILTRES = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'a_jour', libelle: 'A jour', test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non a jour', test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche', libelle: 'Fiche manquante', test: (a) => !a.fiche_renseignement },
  { cle: 'yeps', libelle: 'Manque YEPS', test: (a) => a.manque_yeps },
  { cle: 'passsport', libelle: "Manque PASS'SPORT", test: (a) => a.manque_passsport },
  { cle: 'paiement', libelle: 'Manque paiement', test: (a) => a.manque_paiement },
];

function champCsv(valeur) {
  return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
}

export default function BureauDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('adherents');
  const [adherents, setAdherents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);
  const [importOuvert, setImportOuvert] = useState(false);
  const [mdpOuvert, setMdpOuvert] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({
    login: '',
    password: '',
    role: 'coach',
    adherent_id: '',
    nom: '',
    prenom: '',
  });

  const [showDestroyModal, setShowDestroyModal] = useState(false);
  const [destroyKey, setDestroyKey] = useState('');
  const [destroyError, setDestroyError] = useState(null);
  const [destroyLoading, setDestroyLoading] = useState(false);

  useEffect(() => {
    chargerAdherents();
  }, []);

  useEffect(() => {
    if (activeTab === 'utilisateurs') {
      chargerUtilisateurs();
    }
  }, [activeTab]);

  async function chargerAdherents() {
    setChargement(true);
    setErreur(null);
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

  const listeAdherents = useMemo(() => {
    const f = FILTRES.find((x) => x.cle === filtre) ?? FILTRES[0];
    const q = recherche.trim().toLowerCase();
    return adherents
      .filter(f.test)
      .filter((a) =>
        !q ||
        a.nom.toLowerCase().includes(q) ||
        a.prenom.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q)
      );
  }, [adherents, filtre, recherche]);

  const stats = useMemo(() => {
    const aJour = adherents.filter((a) => calculerStatutLicence(a).valide).length;
    return { total: adherents.length, aJour, nonAJour: adherents.length - aJour };
  }, [adherents]);

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

  function onDeleted(id) {
    setAdherents((prev) => prev.filter((a) => a.id !== id));
    setEditeur(null);
  }

  function onImported(nouveaux) {
    setAdherents((prev) =>
      [...prev, ...nouveaux].sort((a, b) => a.nom.localeCompare(b.nom))
    );
  }

  function exporterCsv() {
    const entetes = [
      'Prenom',
      'Nom',
      'Email',
      'Statut',
      'Detail',
      'Fiche renseignement',
      'Paiement global',
      'Manque paiement',
      'Manque YEPS',
      "Manque PASS'SPORT",
      'ID',
    ];

    const lignes = listeAdherents.map((adherent) => {
      const statut = calculerStatutLicence(adherent);
      return [
        adherent.prenom,
        adherent.nom,
        adherent.email ?? '',
        statut.valide ? 'A jour' : 'Non a jour',
        statut.anomalies.join(' | '),
        adherent.fiche_renseignement ? 'Oui' : 'Non',
        adherent.paiement_global ? 'Oui' : 'Non',
        adherent.manque_paiement ? 'Oui' : 'Non',
        adherent.manque_yeps ? 'Oui' : 'Non',
        adherent.manque_passsport ? 'Oui' : 'Non',
        adherent.id,
      ].map(champCsv).join(';');
    });

    const contenu = [entetes.map(champCsv).join(';'), ...lignes].join('\r\n');
    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `adherents-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setUserError(null);

    let nom = userForm.nom;
    let prenom = userForm.prenom;
    if (userForm.adherent_id) {
      const target = adherents.find((a) => a.id === userForm.adherent_id);
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
        prenom,
      });

      setUsers((prev) => [...prev, newUser]);
      setShowAddUser(false);
      setUserForm({ login: '', password: '', role: 'coach', adherent_id: '', nom: '', prenom: '' });
    } catch (error) {
      setUserError(error.message || 'Erreur lors de la creation.');
    }
  }

  async function handleDestroyDB(e) {
    e.preventDefault();
    setDestroyError(null);
    setDestroyLoading(true);

    try {
      await api.destroyDatabase(destroyKey);
      setShowDestroyModal(false);
      await signOut();
      navigate('/login');
    } catch (error) {
      setDestroyError(error.message || 'Cle incorrecte.');
    } finally {
      setDestroyLoading(false);
    }
  }

  return (
    <div className="page">
      <Header titre="Espace Bureau" />

      <div className="container" style={{ marginTop: '20px' }}>
        <div className="chips" style={{ borderBottom: '2px solid var(--line)', paddingBottom: '10px' }}>
          <button
            className={`chip ${activeTab === 'adherents' ? 'chip--on' : ''}`}
            onClick={() => setActiveTab('adherents')}
          >
            Adherents ({adherents.length})
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
            <h2>Adherents <span className="muted">({adherents.length})</span></h2>
            <div className="dash-top-actions">
              <button className="btn-ghost" onClick={() => setMdpOuvert(true)}>
                Mon mot de passe
              </button>
              <button className="btn-ghost" onClick={() => setImportOuvert(true)}>
                Importer CSV
              </button>
              <button className="btn-ghost" onClick={exporterCsv} disabled={listeAdherents.length === 0}>
                Exporter en CSV
              </button>
              <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adherent</button>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-lib">Adherents</span>
            </div>
            <div className="stat stat--ok">
              <span className="stat-num">{stats.aJour}</span>
              <span className="stat-lib">A jour</span>
            </div>
            <div className="stat stat--ko">
              <span className="stat-num">{stats.nonAJour}</span>
              <span className="stat-lib">Non a jour</span>
            </div>
          </div>

          <input
            className="dash-search"
            placeholder="Rechercher un nom, un prenom ou un email..."
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

          {chargement && <p>Chargement...</p>}
          {erreur && <p className="error">{erreur}</p>}

          {!chargement && !erreur && (
            listeAdherents.length === 0 ? (
              <p className="muted dash-empty">Aucun adherent ne correspond.</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Statut</th>
                      <th>Detail</th>
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
                          <td className="small">{valide ? '-' : anomalies.join(' | ')}</td>
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

          {loadingUsers && <p>Chargement des utilisateurs...</p>}
          {userError && <p className="error">{userError}</p>}

          {!loadingUsers && !userError && (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Identifiant</th>
                    <th>Nom affiche</th>
                    <th>Role</th>
                    <th>ID adherent lie</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.login}</strong></td>
                      <td>{u.prenom || ''} {u.nom || ''}</td>
                      <td>{u.role}</td>
                      <td className="small muted">{u.adherent_id || 'Aucun'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      <footer className="container" style={{ marginTop: '40px', padding: '20px', borderTop: '2px dashed #f5c2c2', backgroundColor: '#fff7f7', borderRadius: 'var(--radius)', marginBottom: '40px' }}>
        <h4 style={{ color: 'var(--ko)', margin: '0 0 10px 0' }}>Zone de Danger</h4>
        <p className="small muted" style={{ margin: '0 0 15px 0' }}>
          La reinitialisation supprimera definitivement tous les adherents, tous les comptes utilisateurs, et vous deconnectera.
        </p>
        <button
          onClick={() => { setShowDestroyModal(true); setDestroyError(null); setDestroyKey(''); }}
          style={{ backgroundColor: 'var(--ko)', color: 'white' }}
        >
          Detruire la base de donnees
        </button>
      </footer>

      {editeur && (
        <AdherentEditor
          adherent={editeur.adherent}
          onClose={() => setEditeur(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      {qrAdherent && (
        <QrCodeModal adherent={qrAdherent} onClose={() => setQrAdherent(null)} />
      )}

      {importOuvert && (
        <ImportCsvModal
          onClose={() => setImportOuvert(false)}
          onImported={onImported}
        />
      )}

      {mdpOuvert && <ChangePasswordModal onClose={() => setMdpOuvert(false)} />}

      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <aside className="editor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <form onSubmit={handleAddUser}>
              <h3>Creer un utilisateur</h3>

              <label>
                Identifiant
                <input
                  type="text"
                  value={userForm.login}
                  onChange={(e) => setUserForm((f) => ({ ...f, login: e.target.value }))}
                  required
                />
              </label>

              <label>
                Mot de passe
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </label>

              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="coach">Coach</option>
                  <option value="adherent">Adherent</option>
                  <option value="bureau">Bureau</option>
                </select>
              </label>

              <label>
                Lier a un adherent existant
                <select
                  value={userForm.adherent_id}
                  onChange={(e) => setUserForm((f) => ({ ...f, adherent_id: e.target.value }))}
                >
                  <option value="">-- Aucun --</option>
                  {adherents.map((a) => (
                    <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                  ))}
                </select>
              </label>

              {!userForm.adherent_id && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>
                    Prenom
                    <input
                      type="text"
                      value={userForm.prenom}
                      onChange={(e) => setUserForm((f) => ({ ...f, prenom: e.target.value }))}
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      type="text"
                      value={userForm.nom}
                      onChange={(e) => setUserForm((f) => ({ ...f, nom: e.target.value }))}
                    />
                  </label>
                </div>
              )}

              {userError && <p className="error">{userError}</p>}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddUser(false)}>
                  Annuler
                </button>
                <button type="submit">Creer le compte</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {showDestroyModal && (
        <div className="modal-overlay" onClick={() => setShowDestroyModal(false)}>
          <aside className="editor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <form onSubmit={handleDestroyDB}>
              <h3 style={{ color: 'var(--ko)' }}>Confirmer la destruction</h3>
              <p className="muted small">
                Cette action est irreversible. Saisissez la cle de securite pour confirmer.
              </p>

              <label>
                Cle de securite
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
                <button type="button" className="btn-ghost" onClick={() => setShowDestroyModal(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={destroyLoading} style={{ backgroundColor: 'var(--ko)', color: 'white' }}>
                  {destroyLoading ? 'Destruction...' : 'Valider la destruction'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
