import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import ImportCsvModal from '../components/ImportCsvModal';
import EnvoiQrModal from '../components/EnvoiQrModal';
import './BureauDashboard.css';

// Liste des filtres. `test(adherent)` renvoie true si l'adhérent doit
// apparaître quand ce filtre est actif.
const FILTRES = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'a_jour', libelle: 'À jour', test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non à jour', test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche', libelle: 'Fiche manquante', test: (a) => !a.fiche_renseignement },
  { cle: 'yeps', libelle: 'Manque YEPS', test: (a) => a.manque_yeps },
  { cle: 'passport', libelle: "Manque PASS'SPORT", test: (a) => a.manque_passport },
  { cle: 'paiement', libelle: 'Manque paiement', test: (a) => a.manque_paiement },
];

function champCsv(valeur) {
  return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
}

export default function BureauDashboard() {
  const [adherents, setAdherents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [recherche, setRecherche] = useState('');
  const [filtresActifs, setFiltresActifs] = useState([]);

  // editeur : null = fermé ; { adherent: objet } = édition ; { adherent: null } = création
  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);
  const [importOuvert, setImportOuvert] = useState(false);

  // État de l'envoi groupé des QR codes
  const [envoiModalOuvert, setEnvoiModalOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(null); // null | 'loading' | { sent, remaining, errors }
  const [progression, setProgression] = useState(null); // null | { envoyes, total }

  // Adhérents éligibles à l'envoi : email présent + jamais reçu le QR
  const adherentsEligibles = useMemo(
    () => adherents.filter((a) => a.email && !a.qr_envoye_le),
    [adherents]
  );

  // Nombre d'emails envoyés aujourd'hui (pour la limite journalière Gmail de 500).
  const envoiesAujourdhui = useMemo(() => {
    const aujourd = new Date().toISOString().slice(0, 10);
    return adherents.filter((a) => a.qr_envoye_le?.startsWith(aujourd)).length;
  }, [adherents]);

  // Chargement initial et abonnement Realtime depuis Supabase.
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
              return [...prev, nv].sort((a, b) => a.nom.localeCompare(b.nom));
            });
          } else if (payload.eventType === 'UPDATE') {
            const nv = payload.new;
            setAdherents((prev) => {
              const maj = prev.map((a) => (a.id === nv.id ? nv : a));
              return maj.sort((a, b) => a.nom.localeCompare(b.nom));
            });
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

  // Liste affichée = filtres actifs + recherche texte.
  useEffect(() => {
    function handleReset() {
      setAdherents([]);
    }

    window.addEventListener('adherents:reset', handleReset);
    return () => window.removeEventListener('adherents:reset', handleReset);
  }, []);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtres = FILTRES.filter((x) => x.cle !== 'tous' && filtresActifs.includes(x.cle));

    return adherents
      .filter((a) => filtres.every((f) => f.test(a)))
      .filter((a) =>
        !q ||
        a.nom.toLowerCase().includes(q) ||
        a.prenom.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q)
      );
  }, [adherents, filtresActifs, recherche]);

  // Statistiques globales (sur tous les adhérents, pas seulement la liste filtrée).
  const stats = useMemo(() => {
    let aJour = 0;
    for (const a of adherents) {
      if (calculerStatutLicence(a).valide) aJour++;
    }
    return { total: adherents.length, aJour, nonAJour: adherents.length - aJour };
  }, [adherents]);

  // Après création/mise à jour : on rafraîchit la liste localement (sans recharger).
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

  // Après suppression : on retire la fiche de la liste et on ferme le panneau.
  function onDeleted(id) {
    setAdherents((prev) => prev.filter((a) => a.id !== id));
    setEditeur(null);
  }

  // Après un import CSV : on ajoute les nouvelles fiches à la liste, triées par nom.
  function onImported(nouveaux) {
    setAdherents((prev) =>
      [...prev, ...nouveaux].sort((a, b) => a.nom.localeCompare(b.nom))
    );
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

  // Envoie les QR codes par lots de 15 pour une liste d'IDs donnée.
  async function envoyerAvecIds(ids) {
    setEnvoiModalOuvert(false);
    setEnvoi('loading');
    setProgression({ envoyes: 0, total: ids.length });

    let totalEnvoyes = 0;
    const tousLesErreurs = [];
    let i = 0;

    try {
      while (i < ids.length) {
        const batch = ids.slice(i, i + 15);
        const res = await fetch('/api/send-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adherentIds: batch }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');

        totalEnvoyes += data.sent;
        tousLesErreurs.push(...data.errors);
        i += batch.length;
        setProgression({ envoyes: totalEnvoyes, total: ids.length });
      }
      setEnvoi({ sent: totalEnvoyes, remaining: 0, errors: tousLesErreurs });
    } catch (err) {
      setEnvoi({ sent: totalEnvoyes, remaining: null, errors: [{ nom: 'Serveur', raison: err.message }] });
    } finally {
      setProgression(null);
    }
  }

  // Exporte la liste actuellement affichée (filtre + recherche) au format CSV.
  function exporterCsv() {
    const entetes = [
      'Prénom',
      'Nom',
      'Email',
      'Statut',
      'Détail',
      'Fiche renseignement',
      'Paiement global',
      'Manque paiement',
      'Manque YEPS',
      "Manque PASS'SPORT",
      'ID',
    ];

    const lignes = liste.map((adherent) => {
      const statut = calculerStatutLicence(adherent);
      return [
        adherent.prenom,
        adherent.nom,
        adherent.email ?? '',
        statut.valide ? 'À jour' : 'Non à jour',
        statut.anomalies.join(' | '),
        adherent.fiche_renseignement ? 'Oui' : 'Non',
        adherent.paiement_global ? 'Oui' : 'Non',
        adherent.manque_paiement ? 'Oui' : 'Non',
        adherent.manque_yeps ? 'Oui' : 'Non',
        adherent.manque_passport ? 'Oui' : 'Non',
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
          <h2>Adhérents <span className="muted">({adherents.length})</span></h2>
          <div className="dash-top-actions">
            <button className="btn-ghost" onClick={() => setImportOuvert(true)}>
              Importer CSV
            </button>
            <button className="btn-ghost" onClick={exporterCsv} disabled={liste.length === 0}>
              Exporter en CSV
            </button>
            <button
              className="btn-ghost"
              onClick={() => setEnvoiModalOuvert(true)}
              disabled={envoi === 'loading' || adherentsEligibles.length === 0}
              title={adherentsEligibles.length === 0 ? 'Tous les adhérents ont déjà reçu leur QR Code' : undefined}
            >
              {envoi === 'loading' ? 'Envoi en cours…' : `Envoyer les QR par email (${adherentsEligibles.length})`}
            </button>
            <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adhérent</button>
          </div>
          <p className="muted small" style={{ textAlign: 'right', marginTop: 6 }}>
            Limite Gmail : {envoiesAujourdhui} / 500 emails envoyés aujourd'hui
          </p>
        </div>

        {envoi === 'loading' && progression && (
          <div className="envoi-progress">
            <div className="envoi-progress__bar">
              <div
                className="envoi-progress__fill"
                style={{
                  width: progression.total
                    ? `${Math.round((progression.envoyes / progression.total) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            <p className="envoi-progress__label">
              {progression.envoyes} / {progression.total ?? '…'} emails envoyés
              {progression.total && (
                <span className="muted"> · {Math.round((progression.envoyes / progression.total) * 100)}%</span>
              )}
            </p>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-lib">Adhérents</span>
          </div>
          <div className="stat stat--ok">
            <span className="stat-num">{stats.aJour}</span>
            <span className="stat-lib">À jour</span>
          </div>
          <div className="stat stat--ko">
            <span className="stat-num">{stats.nonAJour}</span>
            <span className="stat-lib">Non à jour</span>
          </div>
        </div>

        <input
          className="dash-search"
          placeholder="Rechercher un nom, un prénom ou un email…"
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

        {chargement && <p>Chargement…</p>}
        {erreur && <p className="error">{erreur}</p>}

        {!chargement && !erreur && (
          liste.length === 0 ? (
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
                  {liste.map((a) => {
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

      {envoiModalOuvert && (
        <EnvoiQrModal
          adherents={adherentsEligibles}
          onClose={() => setEnvoiModalOuvert(false)}
          onConfirm={envoyerAvecIds}
        />
      )}

      {envoi && envoi !== 'loading' && (
        <div className="modal-overlay" onClick={() => setEnvoi(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Résultat de l'envoi</h3>
            <p>
              <strong style={{ color: 'var(--ok)' }}>{envoi.sent} email(s) envoyé(s)</strong>
            </p>
            {envoi.remaining > 0 && (
              <p className="muted small" style={{ marginTop: 8 }}>
                {envoi.remaining} adhérent(s) restant(s) — relancez le bouton demain pour continuer.
              </p>
            )}
            {envoi.remaining === 0 && envoi.sent > 0 && (
              <p className="small" style={{ color: 'var(--ok)', marginTop: 8 }}>
                Tous les adhérents ont reçu leur QR Code.
              </p>
            )}
            {envoi.errors.length > 0 && (
              <>
                <p className="error">{envoi.errors.length} échec(s) :</p>
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {envoi.errors.map((e, i) => (
                    <li key={i} className="small error">{e.nom} — {e.raison}</li>
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
