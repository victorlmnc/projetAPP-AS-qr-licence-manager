import Header from '../components/Header';

// ====== À CONSTRUIRE — Personnes 2 & 3 ======
// Cette page est volontairement vide : seul le cadre (en-tête + rôle protégé)
// est posé. Reprenez les points ci-dessous.
export default function BureauDashboard() {
  return (
    <div className="page">
      <Header titre="Espace Bureau" />

      <main className="container">
        <h2>Tableau de bord des adhérents</h2>
        <p className="muted">Zone à construire (Personnes 2 &amp; 3).</p>

        <ul className="todo">
          <li>Lister tous les adhérents (table <code>adherents</code>).</li>
          <li>Filtres : manque YEPS, manque PASS'SPORT, fiche manquante, etc.</li>
          <li>
            Afficher le statut via <code>calculerStatutLicence()</code>{' '}
            (<code>src/lib/licence.js</code>) — ne pas recalculer à la main.
          </li>
          <li>Formulaire de mise à jour rapide (cases à cocher) qui écrit en base.</li>
          <li>
            QR Code unique : composant <code>QRCodeCanvas</code> de{' '}
            <code>qrcode.react</code>, en encodant <code>adherent.id</code>.
          </li>
        </ul>
      </main>
    </div>
  );
}
