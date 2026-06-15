import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence } from '../lib/licence';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AdherentEditor from '../components/AdherentEditor';
import QrCodeModal from '../components/QrCodeModal';
import './BureauDashboard.css';

// Liste des filtres. `test(adherent)` renvoie true si l'adhérent doit
// apparaître quand ce filtre est actif.
const FILTRES = [
  { cle: 'tous',       libelle: 'Tous',              test: () => true },
  { cle: 'a_jour',     libelle: 'À jour',            test: (a) => calculerStatutLicence(a).valide },
  { cle: 'non_a_jour', libelle: 'Non à jour',        test: (a) => !calculerStatutLicence(a).valide },
  { cle: 'fiche',      libelle: 'Fiche manquante',   test: (a) => !a.fiche_renseignement },
  { cle: 'yeps',       libelle: 'Manque YEPS',       test: (a) => a.manque_yeps },
  { cle: 'passsport',  libelle: "Manque PASS'SPORT", test: (a) => a.manque_passsport },
  { cle: 'paiement',   libelle: 'Manque paiement',   test: (a) => a.manque_paiement },
];

// Échappe une valeur pour le format CSV : on entoure de guillemets et on double
// les guillemets internes, pour gérer virgules/accents/retours à la ligne.
function champCsv(valeur) {
  return `"${String(valeur ?? '').replace(/"/g, '""')}"`;
}

export default function BureauDashboard() {
  const [adherents, setAdherents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');

  // editeur : null = fermé ; { adherent: objet } = édition ; { adherent: null } = création
  const [editeur, setEditeur] = useState(null);
  const [qrAdherent, setQrAdherent] = useState(null);

  // Chargement initial depuis Supabase.
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
  }, []);

  // Liste affichée = filtre actif + recherche texte. useMemo évite de recalculer
  // à chaque rendu si rien n'a changé.
  const liste = useMemo(() => {
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

  // Statistiques globales (sur tous les adhérents, pas seulement la liste filtrée).
  const stats = useMemo(() => {
    let aJour = 0;
    for (const a of adherents) if (calculerStatutLicence(a).valide) aJour++;
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

  // Exporte la liste actuellement affichée (filtre + recherche) au format CSV.
  function exporterCsv() {
    const entetes = ['Nom', 'Prénom', 'Email', 'Fiche', 'Paiement', 'Statut', 'Détail'];
    const lignes = liste.map((a) => {
      const { valide, anomalies } = calculerStatutLicence(a);
      return [
        a.nom,
        a.prenom,
        a.email ?? '',
        a.fiche_renseignement ? 'Oui' : 'Non',
        a.paiement_global ? 'Oui' : 'Non',
        valide ? 'À jour' : 'Non à jour',
        valide ? '' : anomalies.join(' ; '),
      ].map(champCsv).join(',');
    });

    const contenu = [entetes.map(champCsv).join(','), ...lignes].join('\n');
    // Le BOM (\uFEFF) garantit l'affichage correct des accents dans Excel.
    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'adherents.csv';
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
            <button className="btn-ghost" onClick={exporterCsv} disabled={liste.length === 0}>
              Exporter en CSV
            </button>
            <button onClick={() => setEditeur({ adherent: null })}>+ Nouvel adhérent</button>
          </div>
        </div>

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
    </div>
  );
}
