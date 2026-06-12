import { calculerStatutLicence } from '../lib/licence';

// Bandeau de résultat réutilisable.
//   Vert  = licence à jour.
//   Rouge = non à jour + liste des motifs.
export default function StatusBanner({ adherent }) {
  const { valide, anomalies } = calculerStatutLicence(adherent);

  return (
    <div className={`banner ${valide ? 'banner--ok' : 'banner--ko'}`}>
      <p className="banner__title">
        {valide ? '✓ Licence à jour' : '✗ Licence non à jour'}
      </p>

      {!valide && (
        <ul className="banner__list">
          {anomalies.map((motif, i) => (
            <li key={i}>{motif}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
