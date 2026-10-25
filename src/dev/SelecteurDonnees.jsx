import { useEffect, useState } from 'react';
import { JEUX, LIBELLES, jeuDepuisUrl } from './donneesTest';

// Outil de développement : bascule entre les jeux de données de test.
// Toujours appelé derrière import.meta.env.DEV, donc absent du build de production.

const EVENEMENT = 'jeu-de-test';

// Jeu de données actif, lu dans l'URL (?data=…) ; null = vraies données.
export function useJeuDeTest() {
  const [jeu, setJeu] = useState(() => (import.meta.env.DEV ? jeuDepuisUrl() : null));

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const majJeu = () => setJeu(jeuDepuisUrl());
    window.addEventListener(EVENEMENT, majJeu);
    window.addEventListener('popstate', majJeu);
    return () => {
      window.removeEventListener(EVENEMENT, majJeu);
      window.removeEventListener('popstate', majJeu);
    };
  }, []);

  return jeu;
}

const styles = {
  piste: {
    position: 'fixed',
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    gap: 2,
    maxWidth: 'calc(100vw - 16px)',
    overflowX: 'auto',
    padding: 3,
    borderRadius: 10,
    background: '#e5e5e5',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    font: '12px system-ui, sans-serif',
  },
  segment: {
    flexShrink: 0,
    padding: '6px 10px',
    border: 0,
    borderRadius: 7,
    background: 'transparent',
    color: '#444',
    font: 'inherit',
    fontWeight: 500,
    boxShadow: 'none',
    transform: 'none',
    transition: 'none',
    cursor: 'pointer',
  },
  actif: {
    background: '#fff',
    color: '#111',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
  },
};

export function SelecteurDonnees() {
  const jeu = useJeuDeTest() ?? 'demo';

  function choisir(nouveau) {
    const url = new URL(window.location.href);
    url.searchParams.set('data', nouveau);
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(EVENEMENT));
  }

  return (
    <div role="radiogroup" aria-label="Jeu de données de test" style={styles.piste}>
      {JEUX.map((j) => (
        <button
          key={j}
          type="button"
          role="radio"
          aria-checked={j === jeu}
          onClick={() => choisir(j)}
          style={j === jeu ? { ...styles.segment, ...styles.actif } : styles.segment}
        >
          {LIBELLES[j]}
        </button>
      ))}
    </div>
  );
}
