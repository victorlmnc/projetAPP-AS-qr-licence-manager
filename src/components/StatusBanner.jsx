import { calculerStatutLicence } from '../lib/licence';

export default function StatusBanner({ adherent }) {
  const { valide, anomalies } = calculerStatutLicence(adherent);

  return (
    <div className={`banner ${valide ? 'banner--ok' : 'banner--ko'}`}>
      <p className="banner__eyebrow">{valide ? 'Contrôle valide' : 'Contrôle bloqué'}</p>
      <p className="banner__title">
        {valide ? 'Licence à jour' : 'Licence non à jour'}
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
