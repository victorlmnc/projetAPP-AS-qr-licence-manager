import { calculerStatutLicence } from '../lib/licence';

export default function StatusBanner({ adherent }) {
  const { valide, anomalies } = calculerStatutLicence(adherent);

  return (
    <div className={`banner ${valide ? 'banner--ok' : 'banner--ko'}`}>
      <p className="banner__eyebrow">{valide ? 'Controle valide' : 'Controle bloque'}</p>
      <p className="banner__title">
        {valide ? 'Licence a jour' : 'Licence non a jour'}
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
