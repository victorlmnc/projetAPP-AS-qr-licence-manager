import { useEffect } from 'react';

const NOM_SITE = 'AS INSA CVL';

// Titre de l'onglet du navigateur : la page d'abord (les onglets sont souvent
// tronqués), puis le nom du site. Le titre précédent est rétabli en quittant la page.
export function useTitrePage(page) {
  useEffect(() => {
    const precedent = document.title;
    document.title = `${page} · ${NOM_SITE}`;
    return () => {
      document.title = precedent;
    };
  }, [page]);
}
