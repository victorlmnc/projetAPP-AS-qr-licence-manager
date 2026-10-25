// Import des commandes de merch depuis un export du site de paiement (ou le
// modèle fourni). Les colonnes sont reconnues par leur nom, les lignes d'un
// même adhérent sont regroupées, puis comparées aux fiches existantes.
// L'import ne fait qu'ajouter : il ne retire jamais un article déjà noté et ne
// touche pas aux cases « récupéré ».

import { reparerTexte } from './texte.js';

export function normaliser(valeur) {
  return reparerTexte(String(valeur ?? ''))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Formules vendues par l'AS → articles. « avec YEPS » ne change pas les articles.
//   Licence seule                     → rien
//   Licence + maillot / Maillot seul  → maillot
//   Licence + ensemble                → maillot + short
//   Short seul                        → short
//   Flocage (nom au dos)              → flocage (option du maillot)
export function articlesDepuisFormule(formule) {
  const f = normaliser(formule);
  const ensemble = f.includes('ensemble');
  return {
    maillot: ensemble || f.includes('maillot'),
    short: ensemble || f.includes('short'),
    flocage: f.includes('flocage') || f.includes('nom au dos'),
  };
}

// « m », « Taille M », « 2XL », « xxxl » → « M », « M », « XXL », « 3XL ».
// Une valeur non reconnue (« Taille unique ») est gardée telle quelle.
export function normaliserTaille(valeur) {
  const brut = reparerTexte(String(valeur ?? '')).trim();
  if (!brut) return null;
  const t = brut.toUpperCase().replace(/^TAILLE\s*:?\s*/, '').replace(/\s+/g, '');
  const equivalences = { XXL: 'XXL', '2XL': 'XXL', XXXL: '3XL', '3XL': '3XL' };
  if (equivalences[t]) return equivalences[t];
  if (['XS', 'S', 'M', 'L', 'XL'].includes(t)) return t;
  return brut;
}

function trouverColonne(cles, test) {
  return cles.find((cle) => test(normaliser(cle))) ?? null;
}

// Colonnes utiles, repérées par leur nom (casse et accents ignorés).
export function detecterColonnes(cles) {
  const estFlocage = (k) => k.includes('flocage') || k.includes('nom au dos') || k.includes('texte');
  return {
    email: trouverColonne(cles, (k) => k.includes('mail') || k.includes('courriel')),
    prenom: trouverColonne(cles, (k) => k.includes('prenom')),
    nom: trouverColonne(cles, (k) => /\bnom\b/.test(k) && !k.includes('prenom') && !estFlocage(k)),
    formule: trouverColonne(cles, (k) => ['formule', 'tarif', 'offre', 'article', 'produit'].some((m) => k.includes(m))),
    tailleMaillot: trouverColonne(cles, (k) => k.includes('taille') && k.includes('maillot')),
    tailleShort: trouverColonne(cles, (k) => k.includes('taille') && k.includes('short')),
    taille: trouverColonne(cles, (k) => k.includes('taille') && !k.includes('maillot') && !k.includes('short')),
    texteFlocage: trouverColonne(cles, (k) => estFlocage(k) && !k.includes('formule') && !k.includes('tarif')),
  };
}

function valeur(ligne, colonne) {
  return colonne ? reparerTexte(String(ligne[colonne] ?? '')).trim() : '';
}

// Regroupe les lignes par adhérent (email, sinon nom + prénom).
export function regrouperCommandes(lignes, colonnes) {
  const commandes = new Map();

  for (const ligne of lignes) {
    const email = valeur(ligne, colonnes.email).toLowerCase();
    const nom = valeur(ligne, colonnes.nom);
    const prenom = valeur(ligne, colonnes.prenom);
    if (!email && !(nom && prenom)) continue;

    const cle = email || `${normaliser(nom)}|${normaliser(prenom)}`;
    const commande = commandes.get(cle) ?? {
      email, nom, prenom,
      maillot: false, short: false, flocage: false,
      taille_maillot: null, taille_short: null, texte_flocage: null,
    };

    const tailleMaillot = normaliserTaille(valeur(ligne, colonnes.tailleMaillot));
    const tailleShort = normaliserTaille(valeur(ligne, colonnes.tailleShort));
    const tailleGenerique = normaliserTaille(valeur(ligne, colonnes.taille));
    const texte = valeur(ligne, colonnes.texteFlocage);

    // Sans colonne « formule », les articles se déduisent des colonnes remplies.
    const articles = colonnes.formule
      ? articlesDepuisFormule(valeur(ligne, colonnes.formule))
      : { maillot: !!tailleMaillot, short: !!tailleShort, flocage: !!texte };

    commande.maillot ||= articles.maillot;
    commande.short ||= articles.short;
    commande.flocage ||= articles.flocage || (!!texte && !colonnes.formule);

    commande.taille_maillot = tailleMaillot
      ?? (articles.maillot && tailleGenerique ? tailleGenerique : null)
      ?? commande.taille_maillot;
    commande.taille_short = tailleShort
      ?? (articles.short && !articles.maillot && tailleGenerique ? tailleGenerique : null)
      ?? commande.taille_short;
    if (texte && (articles.flocage || !colonnes.formule || commande.flocage)) commande.texte_flocage = texte;

    if (commande.maillot || commande.short || commande.flocage) {
      commandes.set(cle, commande);
    } else if (!commandes.has(cle)) {
      // Licence seule : rien à importer, mais on garde la trace pour ne pas
      // signaler la ligne comme « non reconnue ».
      commandes.set(cle, commande);
    }
  }

  return [...commandes.values()];
}

function retrouverAdherent(commande, adherents) {
  if (commande.email) {
    const parEmail = adherents.find((a) => a.email?.trim().toLowerCase() === commande.email);
    if (parEmail) return parEmail;
  }
  if (commande.nom && commande.prenom) {
    const nom = normaliser(commande.nom);
    const prenom = normaliser(commande.prenom);
    return adherents.find((a) => normaliser(a.nom) === nom && normaliser(a.prenom) === prenom) ?? null;
  }
  return null;
}

/**
 * Compare les commandes aux fiches et prépare les mises à jour.
 * @returns {{ miseAJour: {adherent, changements}[], introuvables: object[], avertissements: string[] }}
 */
export function preparerImport(commandes, adherents) {
  const miseAJour = [];
  const introuvables = [];
  const avertissements = [];

  for (const commande of commandes) {
    if (!commande.maillot && !commande.short && !commande.flocage) continue;

    const adherent = retrouverAdherent(commande, adherents);
    if (!adherent) {
      introuvables.push(commande);
      continue;
    }

    const changements = {};
    const aMaillot = adherent.maillot || commande.maillot;

    if (commande.maillot && !adherent.maillot) changements.maillot = true;
    if (aMaillot && commande.taille_maillot && commande.taille_maillot !== adherent.taille_maillot) {
      changements.taille_maillot = commande.taille_maillot;
    }

    if (commande.flocage) {
      if (!aMaillot) {
        avertissements.push(`${adherent.prenom} ${adherent.nom} : flocage sans maillot, ignoré.`);
      } else {
        if (!adherent.flocage) changements.flocage = true;
        if (commande.texte_flocage && commande.texte_flocage !== adherent.texte_flocage) {
          changements.texte_flocage = commande.texte_flocage.slice(0, 20);
        }
      }
    }

    if (commande.short && !adherent.short) changements.short = true;
    if ((adherent.short || commande.short) && commande.taille_short && commande.taille_short !== adherent.taille_short) {
      changements.taille_short = commande.taille_short;
    }

    if (Object.keys(changements).length > 0) miseAJour.push({ adherent, changements });
  }

  return { miseAJour, introuvables, avertissements };
}

// « Maillot (M), floqué « DUPONT », Short (L) » : ce que l'import va noter.
export function resumeChangements(changements, adherent) {
  const parties = [];
  if (changements.maillot || changements.taille_maillot) {
    const taille = changements.taille_maillot ?? adherent.taille_maillot;
    parties.push(taille ? `Maillot (${taille})` : 'Maillot');
  }
  if (changements.flocage || changements.texte_flocage) {
    const texte = changements.texte_flocage ?? adherent.texte_flocage;
    parties.push(texte ? `floqué « ${texte} »` : 'floqué');
  }
  if (changements.short || changements.taille_short) {
    const taille = changements.taille_short ?? adherent.taille_short;
    parties.push(taille ? `Short (${taille})` : 'Short');
  }
  return parties.join(', ');
}
