import { calculerStatutLicence } from '../lib/licence';

// Pastille compacte affichée dans chaque ligne du tableau.
// Réutilise la logique partagée pour rester cohérente avec le reste de l'app.
export default function StatusBadge({ adherent }) {
  const { valide } = calculerStatutLicence(adherent);

  return (
    <span className={`status-badge ${valide ? 'status-badge--ok' : 'status-badge--ko'}`}>
      {valide ? 'À jour' : 'Non à jour'}
    </span>
  );
}
