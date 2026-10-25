import { expect } from '@playwright/test';

// Ouvre une route de développement avec un jeu de données de test
// (demo, pire, vide, un, gros : voir src/dev/donneesTest.js).
export async function ouvrir(page, route, jeu) {
  await page.goto(`/dev/${route}?data=${jeu}`);
}

// Éléments qui sortent de l'écran par la droite, hors zones prévues pour
// défiler ou masquer leur contenu, et hors sélecteur de données de test.
function elementsQuiDebordent(page) {
  return page.evaluate(() => {
    const largeur = document.documentElement.clientWidth;
    const resultats = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[aria-label="Jeu de données de test"]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= largeur + 1) continue;
      let contenu = false;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(parent).overflowX)) {
          contenu = true;
          break;
        }
      }
      if (!contenu) {
        const texte = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        resultats.push(`<${el.tagName.toLowerCase()} class="${el.className}"> « ${texte} »`);
      }
    }
    return resultats;
  });
}

export async function attendreSansDebordement(page) {
  expect(await elementsQuiDebordent(page)).toEqual([]);
}

// Vrai si le contenu de l'élément dépasse sa largeur (texte coupé ou masqué).
export function deborde(locator) {
  return locator.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
}
