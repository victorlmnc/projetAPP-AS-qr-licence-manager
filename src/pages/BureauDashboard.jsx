import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import ImportCsvModal from '../components/ImportCsvModal';
import EnvoiQrModal from '../components/EnvoiQrModal';
import { nomComplet, reparerTexte } from '../lib/texte';
import './BureauDashboard.css';

const FILTRES = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'a_jour', libelle: 'A jour', test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non a jour', test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche', libelle: 'Fiche manquante', test: (a) => !a.fiche_renseignement },
  { cle: 'yeps', libelle: 'Manque YEPS', test: (a) => a.manque_yeps },
  { cle: 'passport', libelle: "Manque PASS'SPORT", test: (a) => a.manque_passport },
  { cle: 'paiement', libelle: 'Manque paiement', test: (a) => a.manque_paiement },
];

const HISTORIQUE_MAX = 8;

function champCsv(valeur) {
  return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
}

function trierAdherents(liste) {
  return [...liste].sort((a, b) => reparerTexte(a.nom).localeCompare(reparerTexte(b.nom)));
}

function identifiantAction() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function champsModifiables(adherent) {
  return {
    nom: adherent.nom,
    prenom: adherent.prenom,
    email: adherent.email ?? null,
    fiche_renseignement: !!adherent.fiche_renseignement,
    paiement_global: !!adherent.paiement_global,
    manque_paiement: !!adherent.manque_paiement,
    manque_yeps: !!adherent.manque_yeps,
    manque_passport: !!adherent.manque_passport,
  };
}

export default function BureauDashboard() {
  const [adherents, setAdherents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [recherche, setRecherche] = useState('');
  const [filtresActifs, setFiltresActifs] = useState([]);

  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);
  const [importOuvert, setImportOuvert] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [annulationId, setAnnulationId] = useState(null);
  const [envoi, setEnvoi] = useState(null);
  const [envoiModal, setEnvoiModal] = useState(null);
  const [progression, setProgression] = useState(null);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('adherents')
        .select('*')
        .order('nom', { ascending: true });

      if (error) setErreur('Chargement impossible : ' + error.message);
      else setAdherents(data);
      setChargement(false);
    }
    charger();

    const canal = supabase
      .channel('adherents_bureau_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adherents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nv = payload.new;
            setAdherents((prev) => {
              if (prev.some((a) => a.id === nv.id)) return prev;
              return trierAdherents([...prev, nv]);
            });
          } else if (payload.eventType === 'UPDATE') {
            const nv = payload.new;
            setAdherents((prev) => trierAdherents(prev.map((a) => (a.id === nv.id ? nv : a))));
          } else if (payload.eventType === 'DELETE') {
            const anc = payload.old;
            setAdherents((prev) => prev.filter((a) => a.id !== anc.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    function handleReset(event) {
      const deletedFromEvent = event.detail?.deleted;
      setAdherents((prev) => {
        const deleted = Array.isArray(deletedFromEvent) ? deletedFromEvent : prev;
        if (deleted.length > 0) {
          ajouterAction({
            type: 'reset',
            label: `Reinitialisation de ${deleted.length} adherent(s)`,
            deleted,
          });
        }
        return [];
      });
    }

    window.addEventListener('adherents:reset', handleReset);
    return () => window.removeEventListener('adherents:reset', handleReset);
  }, []);

  const liste = useMemo(() => {
    const norm = (s) =>
      reparerTexte(String(s ?? ''))
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    const q = norm(recherche);
    const filtres = FILTRES.filter((x) => x.cle !== 'tous' && filtresActifs.includes(x.cle));

    return adherents
      .filter((a) => filtres.every((f) => f.test(a)))
      .filter((a) => {
        if (!q) return true;
        const nom = norm(a.nom);
        const prenom = norm(a.prenom);
        return (
          nom.includes(q) ||
          prenom.includes(q) ||
          `${prenom} ${nom}`.includes(q) ||
          `${nom} ${prenom}`.includes(q)
        );
      });
  }, [adherents, filtresActifs, recherche]);

  const stats = useMemo(() => {
    let aJour = 0;
    for (const a of adherents) {
      if (calculerStatutLicence(a).valide) aJour++;
    }
    return { total: adherents.length, aJour, nonAJour: adherents.length - aJour };
  }, [adherents]);

  const relancesPossibles = useMemo(
    () => adherents.filter((a) => !calculerStatutLicence(a).valide && a.email),
    [adherents]
  );

  const adherentsEligibles = useMemo(
    () => adherents.filter((a) => a.email && !a.qr_envoye_le),
    [adherents]
  );

  function ajouterAction(action) {
    setHistorique((prev) => [
      {
        id: identifiantAction(),
        date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        undone: false,
        ...action,
      },
      ...prev,
    ].slice(0, HISTORIQUE_MAX));
  }

  function onSaved(adherent) {
    const avant = editeur?.adherent ?? null;

    setAdherents((prev) => {
      const existe = prev.some((a) => a.id === adherent.id);
      const maj = existe ? prev.map((a) => (a.id === adherent.id ? adherent : a)) : [...prev, adherent];
      return trierAdherents(maj);
    });

    ajouterAction(
      avant
        ? {
            type: 'update',
            label: `Modification de ${nomComplet(adherent)}`,
            before: avant,
            after: adherent,
          }
        : {
            type: 'create',
            label: `Creation de ${nomComplet(adherent)}`,
            created: adherent,
          }
    );

    setEditeur(null);
  }

  function onDeleted(adherentSupprime) {
    setAdherents((prev) => prev.filter((a) => a.id !== adherentSupprime.id));
    ajouterAction({
      type: 'delete',
      label: `Suppression de ${nomComplet(adherentSupprime)}`,
      deleted: adherentSupprime,
    });
    setEditeur(null);
  }

  function onImported(nouveaux) {
    setAdherents((prev) => trierAdherents([...prev, ...nouveaux]));
    ajouterAction({
      type: 'import',
      label: `Import de ${nouveaux.length} adherent(s)`,
      created: nouveaux,
    });
  }

  function basculerFiltre(cle) {
    if (cle === 'tous') {
      setFiltresActifs([]);
      return;
    }

    setFiltresActifs((prev) =>
      prev.includes(cle)
        ? prev.filter((x) => x !== cle)
        : [...prev, cle]
    );
  }

  function ouvrirEnvoiModal(mode) {
    const cible = mode === 'reminder' ? relancesPossibles : adherentsEligibles;
    if (cible.length === 0) return;
    setEnvoiModal({ mode, adherents: cible });
  }

  async function envoyerQrSelection(ids) {
    const mode = envoiModal?.mode ?? 'all';
    const cible = Array.isArray(ids) ? ids : [];
    if (cible.length === 0) return;

    setEnvoiModal(null);
    setEnvoi('loading');
    setProgression({ traites: 0, total: cible.length, envoyes: 0 });

    let totalEnvoyes = 0;
    let totalIgnores = 0;
    const erreurs = [];

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session bureau introuvable.');

      for (let i = 0; i < cible.length; i += 15) {
        const batch = cible.slice(i, i + 15);
        const res = await fetch('/api/send-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode: mode === 'reminder' ? 'reminder' : 'all',
            adherentIds: batch,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');

        totalEnvoyes += data.sent ?? 0;
        totalIgnores += data.skipped ?? 0;
        erreurs.push(...(data.errors ?? []));
        setProgression({
          traites: Math.min(i + batch.length, cible.length),
          total: cible.length,
          envoyes: totalEnvoyes,
        });
      }

      setEnvoi({ sent: totalEnvoyes, skipped: totalIgnores, remaining: 0, errors: erreurs, mode });
    } catch (err) {
      setEnvoi({
        sent: totalEnvoyes,
        skipped: totalIgnores,
        remaining: null,
        mode,
        errors: [{ nom: 'Serveur', raison: err.message }, ...erreurs],
      });
    } finally {
      setProgression(null);
    }
  }

  async function annulerAction(action) {
    if (action.undone) return;
    setErreur(null);
    setAnnulationId(action.id);

    try {
      if (action.type === 'create') {
        const { error } = await supabase.from('adherents').delete().eq('id', action.created.id);
        if (error) throw error;
        setAdherents((prev) => prev.filter((a) => a.id !== action.created.id));
      } else if (action.type === 'update') {
        const { data, error } = await supabase
          .from('adherents')
          .update(champsModifiables(action.before))
          .eq('id', action.before.id)
          .select()
          .single();
        if (error) throw error;
        setAdherents((prev) => trierAdherents(prev.map((a) => (a.id === data.id ? data : a))));
      } else if (action.type === 'delete') {
        const { data, error } = await supabase.from('adherents').insert(action.deleted).select().single();
        if (error) throw error;
        setAdherents((prev) => trierAdherents([...prev.filter((a) => a.id !== data.id), data]));
      } else if (action.type === 'import') {
        const ids = action.created.map((a) => a.id);
        const { error } = await supabase.from('adherents').delete().in('id', ids);
        if (error) throw error;
        setAdherents((prev) => prev.filter((a) => !ids.includes(a.id)));
      } else if (action.type === 'reset') {
        const { data, error } = await supabase.from('adherents').insert(action.deleted).select();
        if (error) throw error;
        setAdherents(trierAdherents(data));
      }

      setHistorique((prev) =>
        prev.map((item) => item.id === action.id ? { ...item, undone: true } : item)
      );
    } catch (err) {
      setErreur('Annulation impossible : ' + err.message);
    } finally {
      setAnnulationId(null);
    }
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
      'Token public',
      'ID interne',
    ];

    const lignes = liste.map((adherent) => {
      const statut = calculerStatutLicence(adherent);
      return [
        reparerTexte(adherent.prenom),
        reparerTexte(adherent.nom),
        adherent.email ?? '',
        statut.valide ? 'A jour' : 'Non a jour',
        statut.anomalies.join(' | '),
        adherent.fiche_renseignement ? 'Oui' : 'Non',
        adherent.paiement_global ? 'Oui' : 'Non',
        adherent.manque_paiement ? 'Oui' : 'Non',
        adherent.manque_yeps ? 'Oui' : 'Non',
        adherent.manque_passport ? 'Oui' : 'Non',
        adherent.public_token ?? '',
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

  return (
    <div className="page">
      <Header titre="Espace Bureau" />

      <main className="container dash">
        <div className="dash-top">
          <h2>Adherents <span className="muted">({adherents.length})</span></h2>
          <div className="dash-top-actions">
            <button className="btn-ghost" onClick={() => setImportOuvert(true)}>
              Importer CSV
            </button>
            <button className="btn-ghost" onClick={exporterCsv} disabled={liste.length === 0}>
              Exporter en CSV
            </button>
            <button
              className="btn-ghost"
              onClick={() => ouvrirEnvoiModal('all')}
              disabled={envoi === 'loading' || adherentsEligibles.length === 0}
              title={adherentsEligibles.length === 0 ? 'Tous les adherents avec email ont deja recu leur QR.' : undefined}
            >
              {envoi === 'loading' ? 'Envoi...' : `Envoyer les QR (${adherentsEligibles.length})`}
            </button>
            <button
              className="btn-ghost"
              onClick={() => ouvrirEnvoiModal('reminder')}
              disabled={envoi === 'loading' || relancesPossibles.length === 0}
            >
              Relancer non a jour ({relancesPossibles.length})
            </button>
            <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adherent</button>
          </div>
        </div>

        {envoi === 'loading' && progression && (
          <div className="envoi-progress">
            <div className="envoi-progress__bar">
              <div
                className="envoi-progress__fill"
                style={{
                  width: progression.total
                    ? `${Math.round((progression.traites / progression.total) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            <p className="envoi-progress__label">
              {progression.traites} / {progression.total} traite(s) - {progression.envoyes} email(s) envoye(s)
            </p>
          </div>
        )}

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
          placeholder="Rechercher un nom ou un prenom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <div className="chips">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              className={`chip ${
                (f.cle === 'tous' ? filtresActifs.length === 0 : filtresActifs.includes(f.cle))
                  ? 'chip--on'
                  : ''
              }`}
              onClick={() => basculerFiltre(f.cle)}
              aria-pressed={f.cle === 'tous' ? filtresActifs.length === 0 : filtresActifs.includes(f.cle)}
            >
              {f.libelle}
            </button>
          ))}
        </div>

        {chargement && <p>Chargement...</p>}
        {erreur && <p className="error">{erreur}</p>}

        {!chargement && !erreur && (
          liste.length === 0 ? (
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
                  {liste.map((a) => {
                    const { valide, anomalies } = calculerStatutLicence(a);
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong>{nomComplet(a)}</strong>
                          {a.email && <div className="muted small">{a.email}</div>}
                        </td>
                        <td><StatusBadge adherent={a} /></td>
                        <td className="small">{valide ? '-' : anomalies.join(' - ')}</td>
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

        <section className="history-panel" aria-label="Historique des actions">
          <div className="history-panel__head">
            <h3>Historique recent</h3>
            <span className="muted small">Annulation disponible pendant cette session</span>
          </div>

          {historique.length === 0 ? (
            <p className="muted small">Aucune action modifiable pour le moment.</p>
          ) : (
            <ul className="history-list">
              {historique.map((action) => (
                <li key={action.id} className={`history-item ${action.undone ? 'history-item--done' : ''}`}>
                  <div>
                    <strong>{action.label}</strong>
                    <span className="muted small">{action.date}{action.undone ? ' - annulee' : ''}</span>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => annulerAction(action)}
                    disabled={action.undone || annulationId === action.id}
                  >
                    {annulationId === action.id ? 'Annulation...' : 'Annuler'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

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

      {envoiModal && (
        <EnvoiQrModal
          adherents={envoiModal.adherents}
          title={envoiModal.mode === 'reminder' ? 'Relancer les dossiers non a jour' : 'Envoyer les QR Codes par email'}
          subtitle={
            envoiModal.mode === 'reminder'
              ? 'Selectionnez les adherents non a jour a relancer.'
              : 'Selectionnez les adherents qui doivent recevoir leur lien QR.'
          }
          confirmLabel={envoiModal.mode === 'reminder' ? 'Relancer' : 'Envoyer'}
          onClose={() => setEnvoiModal(null)}
          onConfirm={envoyerQrSelection}
        />
      )}

      {envoi && envoi !== 'loading' && (
        <div className="modal-overlay" onClick={() => setEnvoi(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{envoi.mode === 'reminder' ? 'Resultat de la relance' : "Resultat de l'envoi"}</h3>
            <p>
              <strong className="send-ok">{envoi.sent} email(s) envoye(s)</strong>
              {envoi.skipped > 0 && (
                <span className="muted"> - {envoi.skipped} sans adresse email</span>
              )}
            </p>
            {envoi.errors?.length > 0 && (
              <>
                <p className="error">{envoi.errors.length} echec(s) :</p>
                <ul className="send-errors">
                  {envoi.errors.map((e, i) => (
                    <li key={i} className="small error">{e.nom} - {e.raison}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="modal-actions">
              <button onClick={() => setEnvoi(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
