// Import des commandes de merch depuis un export HelloAsso (CSV ou Excel) ou
// le modèle fourni. Les colonnes sont reconnues par leur nom, les lignes d'un
// même adhérent sont regroupées, puis comparées aux fiches existantes.
// L'import ne fait qu'ajouter : il ne retire jamais un article déjà noté et ne
// touche pas aux cases « récupéré ».

import { reparerTexte } from './texte.js';

function normaliser(valeur) {
  return reparerTexte(String(valeur ?? ''))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Formules vendues par l'AS → articles. « avec YEPS » ne change pas les articles
// mais signale que l'adhérent paie avec l'aide YEPS.
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
    yeps: f.includes('yeps'),
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

// HelloAsso distingue le payeur (parent, ami…) de l'adhérent : on privilégie
// toujours les colonnes de l'adhérent, et celles du payeur en dernier recours.
const COLONNES_ADHERENT = ['adherent', 'participant', 'beneficiaire', 'licencie', 'membre'];
const COLONNES_PAYEUR = ['payeur', 'acheteur', 'commanditaire'];

function choisirColonne(cles, test) {
  const rang = (cle) => {
    const k = normaliser(cle);
    if (COLONNES_ADHERENT.some((m) => k.includes(m))) return 0;
    if (COLONNES_PAYEUR.some((m) => k.includes(m))) return 2;
    return 1;
  };
  return cles.filter((cle) => test(normaliser(cle))).sort((a, b) => rang(a) - rang(b))[0] ?? null;
}

const estMontant = (k) => ['montant', 'prix', 'code', 'promo', 'reduction', 'quantite', 'date', 'reference'].some((m) => k.includes(m));
const estFlocage = (k) => ['flocage', 'floqu', 'nom au dos', 'au dos', 'texte'].some((m) => k.includes(m));
const estProduit = (k) => ['article', 'produit', 'tarif', 'formule', 'offre', 'option', 'campagne', 'formulaire'].some((m) => k.includes(m));

// Colonnes utiles, repérées par leur nom (casse et accents ignorés).
export function detecterColonnes(cles) {
  return {
    email: choisirColonne(cles, (k) => k.includes('mail') || k.includes('courriel')),
    prenom: choisirColonne(cles, (k) => k.includes('prenom')),
    nom: choisirColonne(cles, (k) => /\bnom\b/.test(k) && !k.includes('prenom') && !estFlocage(k) && !estProduit(k)),
    formule: choisirColonne(cles, (k) => ['formule', 'tarif', 'offre', 'article', 'produit'].some((m) => k.includes(m)) && !estMontant(k)),
    options: cles.filter((cle) => normaliser(cle).includes('option') && !estMontant(normaliser(cle))),
    statut: choisirColonne(cles, (k) => k.includes('statut') || k.includes('etat')),
    tailleMaillot: choisirColonne(cles, (k) => k.includes('taille') && k.includes('maillot')),
    tailleShort: choisirColonne(cles, (k) => k.includes('taille') && k.includes('short')),
    taille: choisirColonne(cles, (k) => k.includes('taille') && !k.includes('maillot') && !k.includes('short')),
    texteFlocage: choisirColonne(cles, (k) => estFlocage(k) && !estProduit(k) && !estMontant(k)),
  };
}

function valeur(ligne, colonne) {
  return colonne ? reparerTexte(String(ligne[colonne] ?? '')).trim() : '';
}

// Commande remboursée, annulée ou refusée : à ne pas importer.
function commandeAnnulee(statut) {
  return /rembours|annul|refus|echou|abandon/.test(normaliser(statut));
}

/**
 * Regroupe les lignes par adhérent (email, sinon nom + prénom).
 * @returns {{ commandes: object[], lignesAnnulees: number }}
 */
export function regrouperCommandes(lignes, colonnes) {
  const commandes = new Map();
  let lignesAnnulees = 0;
  const avecFormule = !!colonnes.formule || (colonnes.options?.length ?? 0) > 0;

  for (const ligne of lignes) {
    if (colonnes.statut && commandeAnnulee(valeur(ligne, colonnes.statut))) {
      lignesAnnulees++;
      continue;
    }

    const email = valeur(ligne, colonnes.email).toLowerCase();
    const nom = valeur(ligne, colonnes.nom);
    const prenom = valeur(ligne, colonnes.prenom);
    if (!email && !(nom && prenom)) continue;

    const cle = email || `${normaliser(nom)}|${normaliser(prenom)}`;
    const commande = commandes.get(cle) ?? {
      email, nom, prenom,
      maillot: false, short: false, flocage: false, yeps: false,
      taille_maillot: null, taille_short: null, texte_flocage: null,
    };

    const tailleMaillot = normaliserTaille(valeur(ligne, colonnes.tailleMaillot));
    const tailleShort = normaliserTaille(valeur(ligne, colonnes.tailleShort));
    const tailleGenerique = normaliserTaille(valeur(ligne, colonnes.taille));
    const texte = valeur(ligne, colonnes.texteFlocage);

    // Formule et options (le flocage peut être une option du tarif sur HelloAsso).
    // Sans colonne de formule, les articles se déduisent des colonnes remplies.
    const texteCommande = [valeur(ligne, colonnes.formule), ...(colonnes.options ?? []).map((c) => valeur(ligne, c))].join(' ');
    const articles = avecFormule
      ? articlesDepuisFormule(texteCommande)
      : { maillot: !!tailleMaillot, short: !!tailleShort, flocage: !!texte, yeps: false };

    commande.maillot ||= articles.maillot;
    commande.short ||= articles.short;
    commande.flocage ||= articles.flocage || (!!texte && !avecFormule);
    commande.yeps ||= articles.yeps;

    commande.taille_maillot = tailleMaillot
      ?? (articles.maillot && tailleGenerique ? tailleGenerique : null)
      ?? commande.taille_maillot;
    commande.taille_short = tailleShort
      ?? (articles.short && !articles.maillot && tailleGenerique ? tailleGenerique : null)
      ?? commande.taille_short;
    if (texte && (articles.flocage || !avecFormule || commande.flocage)) commande.texte_flocage = texte;

    commandes.set(cle, commande);
  }

  return { commandes: [...commandes.values()], lignesAnnulees };
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
    if (!commande.maillot && !commande.short && !commande.flocage && !commande.yeps) continue;

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

    // Paiement avec l'aide YEPS : l'aide est à fournir, sauf si le bureau a
    // déjà marqué le paiement complet (la case n'a alors plus lieu d'être).
    if (commande.yeps && !adherent.paiement_global && !adherent.manque_yeps) {
      changements.manque_yeps = true;
    }

    if (Object.keys(changements).length > 0) miseAJour.push({ adherent, changements });
  }

  return { miseAJour, introuvables, avertissements };
}

// « Maillot (M), floqué « DUPONT », Short (L), aide YEPS à fournir » : ce que l'import va noter.
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
  if (changements.manque_yeps) parties.push('aide YEPS (QR code et numéro) à fournir');
  return parties.join(', ');
}
