import { useLayoutEffect, useRef } from 'react';

/**
 * Fenêtre modale basée sur <dialog>. Le navigateur gère :
 *  - la touche Échap (événement `cancel`) ;
 *  - le focus, gardé dans la fenêtre puis rendu à l'élément d'origine ;
 *  - le fond rendu inerte (ni clic ni tabulation derrière la fenêtre).
 *
 * Props :
 *  - onClose()     : appelé sur Échap ou clic à côté de la fenêtre
 *  - dismissible   : false pour bloquer Échap et le clic à côté (envoi en cours…)
 *  - labelledBy    : id du titre de la fenêtre, lu par les lecteurs d'écran
 *  - role          : 'alertdialog' pour une alerte bloquante
 *  - className     : classe du panneau (par défaut `modal`)
 */
export default function Modal({
  onClose,
  dismissible = true,
  labelledBy,
  role,
  className = 'modal',
  children,
}) {
  const ref = useRef(null);
  const appuiSurFond = useRef(false);

  // Effet de layout : la fenêtre s'ouvre avant le premier affichage, et se ferme
  // avant d'être retirée du DOM (sinon le focus ne revient pas au déclencheur).
  useLayoutEffect(() => {
    const dialog = ref.current;
    const declencheur = document.activeElement;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      if (declencheur instanceof HTMLElement && declencheur.isConnected) declencheur.focus();
    };
  }, []);

  function fermer() {
    if (dismissible) onClose?.();
  }

  return (
    <dialog
      ref={ref}
      className="modal-overlay"
      role={role}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        fermer();
      }}
      onClose={() => {
        // Chrome peut forcer la fermeture après plusieurs Échap d'affilée, sans
        // laisser annuler `cancel`. Une fenêtre bloquante (envoi en cours) est rouverte.
        const dialog = ref.current;
        if (!dialog || !dialog.isConnected || dialog.open) return;
        if (dismissible) onClose?.();
        else dialog.showModal();
      }}
      onPointerDown={(e) => {
        appuiSurFond.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Clic commencé et terminé sur le fond (le <dialog> lui-même) : une
        // sélection de texte relâchée hors du panneau ne ferme pas la fenêtre.
        if (appuiSurFond.current && e.target === e.currentTarget) fermer();
      }}
    >
      <div className={className}>{children}</div>
    </dialog>
  );
}
