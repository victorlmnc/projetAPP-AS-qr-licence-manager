// Le statut est calculé par l'appelant (une fois par adhérent, pas à chaque rendu).
export default function StatusBadge({ valide }) {
  return (
    <span className={`status-badge ${valide ? 'status-badge--ok' : 'status-badge--ko'}`}>
      {valide ? 'À jour' : 'Non à jour'}
    </span>
  );
}
