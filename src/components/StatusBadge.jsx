import { calculerStatutLicence } from '../lib/licence';

export default function StatusBadge({ adherent }) {
  const { valide } = calculerStatutLicence(adherent);

  return (
    <span className={`status-badge ${valide ? 'status-badge--ok' : 'status-badge--ko'}`}>
      {valide ? 'A jour' : 'Non a jour'}
    </span>
  );
}
