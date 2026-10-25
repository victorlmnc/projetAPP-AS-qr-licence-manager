// Merch de l'AS : maillot (flocage en option) et short. Chaque article a sa
// propre case « récupéré », car les livraisons n'arrivent pas toujours
// ensemble ; le flocage est remis avec le maillot.

export const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const LONGUEUR_MAX_FLOCAGE = 20;
export const SANS_TAILLE = 'Taille non précisée';

// « M, floqué « DUPONT » »
function detailMaillot(adherent) {
  const texte = adherent.texte_flocage?.trim();
  const flocage = adherent.flocage ? (texte ? `floqué « ${texte} »` : 'floqué') : null;
  return [adherent.taille_maillot || null, flocage].filter(Boolean).join(', ') || null;
}

// Articles commandés par l'adhérent, dans l'ordre d'affichage.
export function articlesMerch(adherent) {
  const articles = [];
  if (adherent?.maillot) {
    articles.push({ cle: 'maillot', libelle: 'Maillot', detail: detailMaillot(adherent), recupere: !!adherent.maillot_recupere });
  }
  if (adherent?.short) {
    articles.push({ cle: 'short', libelle: 'Short', detail: adherent.taille_short || null, recupere: !!adherent.short_recupere });
  }
  return articles;
}

export function merchARemettre(adherent) {
  return articlesMerch(adherent).filter((article) => !article.recupere);
}

// « Maillot (M, floqué « DUPONT »), Short (L) »
export function resumeArticles(articles) {
  return articles.map((a) => (a.detail ? `${a.libelle} (${a.detail})` : a.libelle)).join(', ');
}

function compterTaille(tailles, taille) {
  const cle = taille?.trim() || SANS_TAILLE;
  tailles[cle] = (tailles[cle] ?? 0) + 1;
}

// Tailles dans l'ordre XS → 3XL, puis les tailles inconnues (import), puis « non précisée ».
export function taillesTriees(tailles) {
  const autres = Object.keys(tailles).filter((t) => !TAILLES.includes(t) && t !== SANS_TAILLE).sort();
  return [...TAILLES, ...autres, SANS_TAILLE]
    .filter((t) => tailles[t] > 0)
    .map((t) => [t, tailles[t]]);
}

// ---------- Commande fournisseur (sans aucun nom d'adhérent) ----------

const A_PRECISER = 'À préciser';

// Rang d'une taille dans l'ordre XS → 3XL, tailles inconnues ensuite, « non précisée » en dernier.
function rangTaille(taille) {
  if (taille === SANS_TAILLE) return 2000;
  const i = TAILLES.indexOf(taille);
  return i === -1 ? 1000 : i;
}

function trierTailles(a, b) {
  return rangTaille(a) - rangTaille(b) || a.localeCompare(b, 'fr');
}

// Lignes [taille, maillots, dont floqués, shorts], puis une ligne Total.
export function tableauParTaille(recap) {
  const floquesParTaille = {};
  for (const f of recap.flocage.textes) {
    const taille = f.tailleMaillot?.trim() || SANS_TAILLE;
    floquesParTaille[taille] = (floquesParTaille[taille] ?? 0) + 1;
  }

  const tailles = [...new Set([...Object.keys(recap.maillot.tailles), ...Object.keys(recap.short.tailles)])]
    .sort(trierTailles);

  const lignes = tailles.map((taille) => [
    taille === SANS_TAILLE ? A_PRECISER : taille,
    recap.maillot.tailles[taille] ?? 0,
    floquesParTaille[taille] ?? 0,
    recap.short.tailles[taille] ?? 0,
  ]);
  lignes.push(['Total', recap.maillot.total, recap.flocage.total, recap.short.total]);
  return lignes;
}

// Lignes [taille du maillot, texte à floquer, quantité] : flocages identiques regroupés.
export function tableauFlocages(recap) {
  const groupes = new Map();
  for (const f of recap.flocage.textes) {
    const taille = f.tailleMaillot?.trim() || SANS_TAILLE;
    const texte = f.texte || '';
    const cle = `${taille}\u0000${texte}`;
    groupes.set(cle, { taille, texte, quantite: (groupes.get(cle)?.quantite ?? 0) + 1 });
  }
  return [...groupes.values()]
    .sort((a, b) => trierTailles(a.taille, b.taille) || a.texte.localeCompare(b.texte, 'fr'))
    .map((g) => [g.taille === SANS_TAILLE ? A_PRECISER : g.taille, g.texte || A_PRECISER, g.quantite]);
}

// Ce qu'il faut compléter avant d'envoyer la commande au fournisseur.
export function informationsManquantes(recap) {
  return {
    maillotsSansTaille: recap.maillot.tailles[SANS_TAILLE] ?? 0,
    shortsSansTaille: recap.short.tailles[SANS_TAILLE] ?? 0,
    flocagesSansTexte: recap.flocage.textes.filter((f) => !f.texte).length,
  };
}

// Récapitulatif pour passer commande et suivre la distribution.
// Un flocage n'est compté qu'avec un maillot, et il est remis avec lui.
export function recapCommande(adherents) {
  const recap = {
    maillot: { total: 0, remis: 0, tailles: {} },
    short: { total: 0, remis: 0, tailles: {} },
    flocage: { total: 0, remis: 0, textes: [] },
  };

  for (const a of adherents) {
    if (a.maillot) {
      recap.maillot.total++;
      if (a.maillot_recupere) recap.maillot.remis++;
      compterTaille(recap.maillot.tailles, a.taille_maillot);

      if (a.flocage) {
        recap.flocage.total++;
        if (a.maillot_recupere) recap.flocage.remis++;
        recap.flocage.textes.push({
          adherent: a,
          texte: a.texte_flocage?.trim() || '',
          tailleMaillot: a.taille_maillot || '',
          recupere: !!a.maillot_recupere,
        });
      }
    }
    if (a.short) {
      recap.short.total++;
      if (a.short_recupere) recap.short.remis++;
      compterTaille(recap.short.tailles, a.taille_short);
    }
  }

  return recap;
}
