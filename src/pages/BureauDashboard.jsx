import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import BulkAdherentEditor from '../components/BulkAdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import ImportFormsModal from '../components/ImportFormsModal';
import ImportComplementaireModal from '../components/ImportComplementaireModal';
import EnvoiQrModal from '../components/EnvoiQrModal';
import { nomComplet, reparerTexte } from '../lib/texte';
import './BureauDashboard.css';

// Liste des filtres. `test(adherent)` renvoie true si l'adhérent doit
// apparaître quand ce filtre est actif.
const FILTRES = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'a_jour', libelle: 'À jour', test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non à jour', test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche', libelle: 'Questionnaire manquant', test: (a) => !a.questionnaire_sante_ok },
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
  const [selection, setSelection] = useState([]);
  const [editionMultiple, setEditionMultiple] = useState(false);

  const exportRef = useRef(null);
  const importRef = useRef(null);
  const selectAllRef = useRef(null);
  useEffect(() => {
    function fermerSiExterieur(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) exportRef.current.open = false;
      if (importRef.current && !importRef.current.contains(e.target)) importRef.current.open = false;
    }
    document.addEventListener('mousedown', fermerSiExterieur);
    return () => document.removeEventListener('mousedown', fermerSiExterieur);
  }, []);

  const [recherche, setRecherche] = useState('');
  const [filtresActifs, setFiltresActifs] = useState([]);

  // editeur : null = fermé ; { adherent: objet } = édition ; { adherent: null } = création
  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);
  const [importMode, setImportMode] = useState(null); // null | 'forms' | 'complementaire'

  // État de l'envoi groupé des QR codes
  const [envoiModal, setEnvoiModal] = useState(null);
  const [envoi, setEnvoi] = useState(null); // null | 'loading' | { sent, remaining, errors }
  const [progression, setProgression] = useState(null); // null | { envoyes, total }

  // Adhérents éligibles à l'envoi : email présent
  const adherentsEligibles = useMemo(
    () => adherents.filter((a) => a.email),
    [adherents]
  );

  const relancesPossibles = useMemo(
    () => adherents.filter((a) => a.email && !calculerStatutLicence(a).valide),
    [adherents]
  );

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
    const norm = (s) =>
      reparerTexte(String(s ?? ''))
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
        const email = norm(a.email ?? '');
        return (
          nom.includes(q) ||
          prenom.includes(q) ||
          email.includes(q) ||
          `${prenom} ${nom}`.includes(q) ||
          `${nom} ${prenom}`.includes(q)
        );
      });
  }, [adherents, filtresActifs, recherche]);

  // Statistiques globales (sur tous les adhérents, pas seulement la liste filtrée).
  const idsVisibles = useMemo(() => liste.map((adherent) => adherent.id), [liste]);
  const selectionVisible = useMemo(
    () => idsVisibles.filter((id) => selection.includes(id)),
    [idsVisibles, selection]
  );
  const toutVisibleSelectionne = idsVisibles.length > 0 && selectionVisible.length === idsVisibles.length;
  const selectionPartielle = selectionVisible.length > 0 && !toutVisibleSelectionne;
  const adherentsSelectionnes = useMemo(
    () => adherents.filter((adherent) => selection.includes(adherent.id)),
    [adherents, selection]
  );

  const stats = useMemo(() => {
    let aJour = 0;
    for (const a of adherents) {
      if (calculerStatutLicence(a).valide) aJour++;
    }
    return { total: adherents.length, aJour, nonAJour: adherents.length - aJour };
  }, [adherents]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectionPartielle;
  }, [selectionPartielle]);

  useEffect(() => {
    setSelection((prev) => prev.filter((id) => adherents.some((adherent) => adherent.id === id)));
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

  function onBulkSaved(adherentsMaj) {
    setAdherents((prev) => {
      const map = new Map(prev.map((adherent) => [adherent.id, adherent]));
      for (const adherent of adherentsMaj) {
        map.set(adherent.id, adherent);
      }
      return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom));
    });
    setSelection([]);
    setEditionMultiple(false);
  }

  // Après suppression : on retire la fiche de la liste et on ferme le panneau.
  function onDeleted(id) {
    setAdherents((prev) => prev.filter((a) => a.id !== id));
    setEditeur(null);
  }

  function basculerSelection(id) {
    setSelection((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function basculerSelectionVisible() {
    if (toutVisibleSelectionne) {
      setSelection((prev) => prev.filter((id) => !idsVisibles.includes(id)));
      return;
    }

    setSelection((prev) => [...new Set([...prev, ...idsVisibles])]);
  }

  // Après import forms (touches = array créés+mis à jour) ou complémentaire (touches absent → rechargement).
  async function onImported(touches) {
    if (touches && touches.length > 0) {
      setAdherents((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        for (const a of touches) map.set(a.id, a);
        return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom));
      });
    } else {
      const { data } = await supabase.from('adherents').select('*').order('nom', { ascending: true });
      if (data) setAdherents(data);
    }
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
    setEnvoiModal({
      mode,
      adherents: mode === 'reminder' ? relancesPossibles : adherentsEligibles,
    });
  }

  // Envoie les QR codes par lots de 15 pour une liste d'IDs donnée.
  async function envoyerAvecIds(ids) {
    const mode = envoiModal?.mode ?? 'all';
    setEnvoiModal(null);
    setEnvoi('loading');
    setProgression({ envoyes: 0, total: ids.length });

    let totalEnvoyes = 0;
    const tousLesErreurs = [];
    let i = 0;

    const { data: { session } } = await supabase.auth.getSession();
    try {
      while (i < ids.length) {
        const batch = ids.slice(i, i + 15);
        const res = await fetch('/api/send-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            adherentIds: batch,
            mode: mode === 'reminder' ? 'reminder' : 'all',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');

        totalEnvoyes += data.sent;
        tousLesErreurs.push(...(data.errors ?? []));
        i += batch.length;
        setProgression({ envoyes: totalEnvoyes, total: ids.length });
      }
      setEnvoi({ sent: totalEnvoyes, remaining: 0, errors: tousLesErreurs, mode });
    } catch (err) {
      setEnvoi({ sent: totalEnvoyes, remaining: null, errors: [{ nom: 'Serveur', raison: err.message }], mode });
    } finally {
      setProgression(null);
    }
  }

  const ENTETES_EXPORT = [
    'Prénom', 'Nom', 'Email', 'Statut', 'Détail',
    'Questionnaire santé', 'Paiement global',
    'Manque paiement', 'Manque YEPS', "Manque PASS’SPORT", 'ID',
  ];

  function lignesExport() {
    return liste.map((a) => {
      const statut = calculerStatutLicence(a);
      return [
        reparerTexte(a.prenom),
        reparerTexte(a.nom),
        a.email ?? '',
        statut.valide ? 'À jour' : 'Non à jour',
        statut.anomalies.join(' | ') || '',
        a.questionnaire_sante_ok ? 'Oui' : 'Non',
        a.paiement_global ? 'Oui' : 'Non',
        a.manque_paiement ? 'Oui' : 'Non',
        a.manque_yeps ? 'Oui' : 'Non',
        a.manque_passport ? 'Oui' : 'Non',
        a.id,
      ];
    });
  }

  function exporterCsv() {
    const lignes = lignesExport().map((r) => r.map(champCsv).join(';'));
    const contenu = [ENTETES_EXPORT.map(champCsv).join(';'), ...lignes].join('\r\n');
    const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `adherents-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  function exporterXlsx() {
    const ws = XLSX.utils.aoa_to_sheet([ENTETES_EXPORT, ...lignesExport()]);
    ws['!cols'] = [12, 14, 28, 10, 30, 18, 14, 15, 13, 15, 38].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Adhérants');
    XLSX.writeFile(wb, `adherents-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exporterPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const date = new Date().toLocaleDateString('fr-FR');
    doc.setFontSize(13);
    doc.setTextColor(94, 58, 140);
    doc.text('AS INSA CVL - Bourges — Liste des adhérents', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exporté le ${date} · ${liste.length} adhérent(s)`, 14, 20);

    const colonnes = ['Prénom', 'Nom', 'Email', 'Statut', 'Détail', 'Questionnaire santé', 'Paiement'];
    const lignes = liste.map((a) => {
      const statut = calculerStatutLicence(a);
      return [
        reparerTexte(a.prenom),
        reparerTexte(a.nom),
        a.email ?? '',
        statut.valide ? 'À jour' : 'Non à jour',
        statut.anomalies.join(', ') || '—',
        a.questionnaire_sante_ok ? 'Oui' : 'Non',
        a.paiement_global ? 'Oui' : 'Non',
      ];
    });

    autoTable(doc, {
      head: [colonnes],
      body: lignes,
      startY: 24,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [94, 58, 140], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 243, 247] },
      columnStyles: { 2: { cellWidth: 48 }, 4: { cellWidth: 50 } },
    });

    doc.save(`adherents-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="page">
      <Header titre="Espace Bureau" />

      <main className="container dash">
        <div className="dash-top">
          <h2>Adhérents <span className="muted"></span></h2>
          <div className="dash-top-actions">
            <details className="export-dropdown" ref={importRef}>
              <summary className="btn-ghost export-dropdown__trigger">
                Importer ▾
              </summary>
              <div className="export-dropdown__menu">
                <button className="export-dropdown__item" onClick={() => { setImportMode('forms'); importRef.current.open = false; }}>
                  Données du forms
                </button>
                <button className="export-dropdown__item" onClick={() => { setImportMode('complementaire'); importRef.current.open = false; }}>
                  Infos complémentaires
                </button>
              </div>
            </details>
            <details className="export-dropdown" ref={exportRef}>
              <summary className={`btn-ghost export-dropdown__trigger${liste.length === 0 ? ' export-dropdown__trigger--disabled' : ''}`}>
                Exporter ▾
              </summary>
              {liste.length > 0 && (
                <div className="export-dropdown__menu">
                  <button className="export-dropdown__item" onClick={() => { exporterCsv(); exportRef.current.open = false; }}>CSV (.csv)</button>
                  <button className="export-dropdown__item" onClick={() => { exporterXlsx(); exportRef.current.open = false; }}>Excel (.xlsx)</button>
                  <button className="export-dropdown__item" onClick={() => { exporterPdf(); exportRef.current.open = false; }}>PDF (.pdf)</button>
                </div>
              )}
            </details>
            <button
              className="btn-ghost"
              onClick={() => ouvrirEnvoiModal('all')}
              disabled={envoi === 'loading' || adherentsEligibles.length === 0}
              title={adherentsEligibles.length === 0 ? 'Aucun adhérent avec une adresse email' : undefined}
            >
              {envoi === 'loading' ? 'Envoi en cours…' : `Envoyer les QR par email (${adherentsEligibles.length})`}
            </button>
            <button
              className="btn-ghost"
              onClick={() => ouvrirEnvoiModal('reminder')}
              disabled={envoi === 'loading' || relancesPossibles.length === 0}
            >
              Relancer non à jour ({relancesPossibles.length})
            </button>
            <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adhérent</button>
          </div>

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
        {selection.length > 0 && (
          <div className="dash-bulk-actions">
            <button
              className="btn-ghost"
              onClick={() => setEditionMultiple(true)}
            >
              Modifier la selection ({selection.length})
            </button>
          </div>
        )}

        {erreur && <p className="error">{erreur}</p>}

        {!chargement && !erreur && (
          liste.length === 0 ? (
            <p className="muted dash-empty">Aucun adhérent ne correspond.</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-select-col">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="dash-select"
                        checked={toutVisibleSelectionne}
                        onChange={basculerSelectionVisible}
                        aria-label="Selectionner tous les adherents visibles"
                      />
                    </th>
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
                        <td className="dash-select-col">
                          <input
                            type="checkbox"
                            className="dash-select"
                            checked={selection.includes(a.id)}
                            onChange={() => basculerSelection(a.id)}
                            aria-label={`Selectionner ${nomComplet(a)}`}
                          />
                        </td>
                        <td>
                          <strong>{nomComplet(a)}</strong>
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

      {editionMultiple && adherentsSelectionnes.length > 0 && (
        <BulkAdherentEditor
          adherents={adherentsSelectionnes}
          onClose={() => setEditionMultiple(false)}
          onSaved={onBulkSaved}
        />
      )}

      {qrAdherent && (
        <QrCodeModal adherent={qrAdherent} onClose={() => setQrAdherent(null)} />
      )}

      {importMode === 'forms' && (
        <ImportFormsModal
          onClose={() => setImportMode(null)}
          onImported={onImported}
        />
      )}
      {importMode === 'complementaire' && (
        <ImportComplementaireModal
          onClose={() => setImportMode(null)}
          onImported={onImported}
        />
      )}

      {envoiModal && (
        <EnvoiQrModal
          adherents={envoiModal.adherents}
          title={envoiModal.mode === 'reminder' ? 'Relancer les dossiers non à jour' : 'Envoyer les QR Codes par email'}
          subtitle={
            envoiModal.mode === 'reminder'
              ? 'Sélectionnez les adhérents non à jour à relancer.'
              : undefined
          }
          confirmLabel={envoiModal.mode === 'reminder' ? 'Relancer' : 'Envoyer'}
          onClose={() => setEnvoiModal(null)}
          onConfirm={envoyerAvecIds}
        />
      )}

      {envoi === 'loading' && (
        <div className="modal-overlay modal-overlay--top" role="alertdialog" aria-modal="true">
          <div className="modal sending-modal">
            <div className="sending-spinner" aria-hidden="true" />
            <h3>Envoi en cours...</h3>
            <p className="muted">
              Les emails sont en train d'etre envoyes.
            </p>
            <p className="sending-modal__warning">
              Ne quittez pas et ne rafraichissez pas la page.
            </p>
            {progression && (
              <div className="sending-modal__progress">
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
                  {progression.envoyes} / {progression.total ?? '...'} emails envoyes
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {envoi && envoi !== 'loading' && (
        <div className="modal-overlay" onClick={() => setEnvoi(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{envoi.mode === 'reminder' ? 'Résultat de la relance' : "Résultat de l'envoi"}</h3>
            <p>
              <strong className="send-ok">{envoi.sent} email(s) envoyé(s)</strong>
            </p>
            {envoi.errors?.length > 0 && (
              <>
                <p className="error">{envoi.errors.length} échec(s) :</p>
                <ul className="send-errors">
                  {envoi.errors.map((e, i) => (
                    <li key={i} className="small error">{reparerTexte(e.nom)} — {e.raison}</li>
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
