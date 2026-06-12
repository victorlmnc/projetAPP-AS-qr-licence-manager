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

  return (
    <div className="page">
      <Header titre="Espace Bureau" />

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
        />
      )}

      {qrAdherent && (
        <QrCodeModal adherent={qrAdherent} onClose={() => setQrAdherent(null)} />
      )}
    </div>
  );
}
