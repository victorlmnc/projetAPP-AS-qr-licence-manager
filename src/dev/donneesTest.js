// Jeux de données de test (break-ui), utilisés uniquement en développement.
// Choisis par le paramètre d'URL ?data=demo|pire|vide|un|gros. Chaque appel
// passe par une garde import.meta.env.DEV : rien de ce fichier n'est inclus
// dans le build de production.

export const JEUX = ['demo', 'pire', 'vide', 'un', 'gros'];

export const LIBELLES = {
  demo: 'Démo',
  pire: 'Pire cas',
  vide: 'Vide',
  un: 'Un seul',
  gros: '1 284 lignes',
};

let compteur = 0;

function adherent(champs) {
  compteur += 1;
  const suffixe = String(compteur).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8000-${suffixe}`,
    public_token: `11111111-1111-4111-8111-${suffixe}`,
    nom: 'Martin',
    prenom: 'Jeanne',
    email: null,
    telephone: null,
    sexe: null,
    annee_etude: null,
    date_naissance: null,
    pays_naissance: null,
    dept_naissance: null,
    ville_naissance: null,
    adresse: null,
    code_postal: null,
    ville: null,
    types_licence: ['Sportive'],
    est_responsable_as: false,
    adherent_bde: false,
    licence_ffsu_a_jour: false,
    questionnaire_sante_ok: true,
    activite_contraintes: false,
    situation_handicap: false,
    droit_image: true,
    fiche_renseignement: false,
    paiement_global: true,
    manque_paiement: false,
    manque_yeps: false,
    manque_passport: false,
    maillot: false,
    taille_maillot: null,
    maillot_recupere: false,
    flocage: false,
    texte_flocage: null,
    short: false,
    taille_short: null,
    short_recupere: false,
    ...champs,
  };
}

// Données « gentilles », comme celles qu'on utilise sans y penser.
function demo() {
  return [
    // Maillot floqué, pas encore remis.
    adherent({
      prenom: 'Jeanne', nom: 'Martin', email: 'jeanne.martin@example.com', licence_ffsu_a_jour: true,
      maillot: true, taille_maillot: 'M', flocage: true, texte_flocage: 'MARTIN',
    }),
    // Ensemble (maillot + short) pas encore remis.
    adherent({
      prenom: 'Lucas', nom: 'Bernard', email: 'lucas.bernard@example.com',
      maillot: true, taille_maillot: 'L', short: true, taille_short: 'L',
    }),
    adherent({
      prenom: 'Emma', nom: 'Dubois', email: 'emma.dubois@example.com',
      paiement_global: false, manque_paiement: true,
    }),
    // Short seul, déjà remis.
    adherent({
      prenom: 'Hugo', nom: 'Petit', email: 'hugo.petit@example.com', activite_contraintes: true,
      short: true, taille_short: 'S', short_recupere: true,
    }),
    adherent({
      prenom: 'Léa', nom: 'Robert', email: 'lea.robert@example.com',
      questionnaire_sante_ok: false,
      // Maillot déjà remis.
      maillot: true, taille_maillot: 'S', maillot_recupere: true,
    }),
  ];
}

// Pire cas réaliste : chaque ligne casse une chose différente.
function pire() {
  return [
    // Nom long avec trait d'union et diacritiques, email insécable, tout manque.
    adherent({
      prenom: 'Aleksandra', nom: 'Wiśniewska-Kowalczyk',
      email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
      questionnaire_sante_ok: false, paiement_global: false,
      manque_paiement: true, manque_yeps: true, manque_passport: true,
      // Ensemble floqué, texte à la longueur maximale (20 caractères).
      maillot: true, taille_maillot: 'XL', short: true, taille_short: 'XL',
      flocage: true, texte_flocage: 'WIŚNIEWSKA-KOWALCZYK',
    }),
    // Nom long à rallonge, email avec +, à jour avec les deux badges.
    adherent({
      prenom: 'Christopher Alexander', nom: 'Montgomery III',
      email: 'first.last+billing-notifications@example.com',
      licence_ffsu_a_jour: true, activite_contraintes: true,
      // Maillot commandé sans taille renseignée.
      maillot: true,
    }),
    // Nom de deux lettres, email le plus court possible, flocage le plus court.
    adherent({ prenom: 'Jo', nom: 'Wu', email: 'a@b.co', maillot: true, taille_maillot: 'M', flocage: true, texte_flocage: 'JO' }),
    // Diacritiques empilés, pas d'email, paiement manquant sans détail.
    adherent({
      prenom: 'Ngọc Hân', nom: 'Đặng Thị', email: null,
      paiement_global: false,
    }),
    // CJK sans espace, email à sous-domaines multiples.
    adherent({ prenom: '秀英', nom: '王', email: 'ops@sub.department.region.example.co.uk' }),
    // Mojibake typique d'un CSV exporté en Windows-1252 (doit être réparé à l'affichage).
    adherent({ prenom: 'FranÃ§ois', nom: 'LefÃ¨vre', email: 'francois.lefevre@example.com' }),
    // Apostrophe, accents et trait d'union.
    adherent({
      prenom: 'Seán', nom: "O'Brien-Ó Súilleabháin", email: 'sean.obrien@example.org',
      questionnaire_sante_ok: false,
    }),
    // Saisie malveillante via le formulaire public : doit s'afficher en texte brut.
    adherent({ prenom: 'Test', nom: '<script>alert(1)</script>', email: 'test@example.com' }),
    // Écriture de droite à gauche.
    adherent({ prenom: 'نور الهدى', nom: 'عبد الرحمن', email: 'nour@example.com' }),
    // Particules en minuscules, nom composé très long.
    adherent({
      prenom: 'María José', nom: 'de la Cruz y Fernández', email: 'mariajose.delacruz@example.com',
      paiement_global: false, manque_yeps: true,
    }),
    // Deux adhérents homonymes, seul l'email les distingue.
    adherent({ prenom: 'Thomas', nom: 'Martin', email: 'thomas.martin@example.com' }),
    adherent({ prenom: 'Thomas', nom: 'Martin', email: 'thomas.martin2@example.com', paiement_global: false, manque_paiement: true }),
    // Tout en minuscules, espaces en trop (saisie Google Forms).
    adherent({ prenom: '  dana ', nom: ' lee  ', email: 'dana.lee@example.com' }),
    // Taille venue d'un import, absente de la liste XS → 3XL.
    adherent({
      prenom: 'Konstantin', nom: 'Oberhauser-Wettstein', email: 'konstantin.oberhauser-wettstein@example.com',
      maillot: true, taille_maillot: 'Taille unique',
    }),
  ];
}

const PRENOMS = ['Jeanne', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Aleksandra', 'Christopher Alexander', 'Jo', 'Ngọc Hân', 'Seán', 'María José', 'Thomas'];
const TAILLES_TEST = ['XS', 'S', 'M', 'M', 'L', 'L', 'XL', 'XXL'];
const NOMS = ['Martin','Bernard', 'Dubois', 'Wiśniewska-Kowalczyk', 'Montgomery III', 'Wu', 'Đặng Thị', "O'Brien-Ó Súilleabháin", 'de la Cruz y Fernández', 'Oberhauser-Wettstein'];

// Une promo entière, non paginée : 1 284 lignes.
function gros() {
  return Array.from({ length: 1284 }, (_, i) => {
    const prenom = PRENOMS[i % PRENOMS.length];
    const nom = NOMS[(i * 7) % NOMS.length];
    return adherent({
      prenom,
      nom,
      email: i % 9 === 0 ? null : `adherent.${i}@example.com`,
      questionnaire_sante_ok: i % 5 !== 0,
      paiement_global: i % 3 !== 0,
      manque_paiement: i % 3 === 0,
      manque_yeps: i % 6 === 0,
      maillot: i % 4 === 0,
      taille_maillot: i % 4 === 0 ? TAILLES_TEST[i % TAILLES_TEST.length] : null,
      maillot_recupere: i % 4 === 0 && i % 3 === 0,
      short: i % 8 === 0,
      taille_short: i % 8 === 0 ? TAILLES_TEST[(i + 2) % TAILLES_TEST.length] : null,
      flocage: i % 12 === 0,
      texte_flocage: i % 12 === 0 ? nom.toUpperCase().slice(0, 20) : null,
    });
  }).sort((a, b) => a.nom.localeCompare(b.nom));
}

export function adherentsDeTest(jeu) {
  compteur = 0;
  if (jeu === 'pire') return pire().sort((a, b) => a.nom.localeCompare(b.nom));
  if (jeu === 'vide') return [];
  if (jeu === 'un') return demo().slice(0, 1);
  if (jeu === 'gros') return gros();
  return demo();
}

// Adhérent affiché par le scan et la page publique : le pire de la liste,
// ou null pour l'état « QR inconnu ».
export function adherentScanneDeTest(jeu) {
  compteur = 0;
  if (jeu === 'vide') return null;
  if (jeu === 'pire' || jeu === 'gros') return pire()[0];
  return demo()[0];
}

// Sur les routes /dev/*, le jeu « démo » est affiché par défaut.
export function jeuDepuisUrl() {
  const jeu = new URLSearchParams(window.location.search).get('data');
  if (JEUX.includes(jeu)) return jeu;
  return window.location.pathname.startsWith('/dev/') ? 'demo' : null;
}
