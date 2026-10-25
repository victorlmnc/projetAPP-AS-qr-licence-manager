const MOJIBAKE = [
  ['Ã€', 'À'],
  ['Ã‚', 'Â'],
  ['Ã‡', 'Ç'],
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['ÃŠ', 'Ê'],
  ['Ã‹', 'Ë'],
  ['Ã”', 'Ô'],
  ['Ã–', 'Ö'],
  ['Ã™', 'Ù'],
  ['Ãœ', 'Ü'],
  ['Ã ', 'à'],
  ['Ã¢', 'â'],
  ['Ã§', 'ç'],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã´', 'ô'],
  ['Ã¶', 'ö'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€¦', '…'],
  ['Â·', '·'],
  ['Â ', ' '],
];

export function reparerTexte(valeur) {
  let texte = String(valeur ?? '');

  for (const [source, cible] of MOJIBAKE) {
    texte = texte.replaceAll(source, cible);
  }

  return texte
    .replace(/([A-Za-zÀ-ÿ])�ois\b/g, '$1çois')
    .replace(/�/g, 'é');
}

export function nomComplet(adherent) {
  return `${reparerTexte(adherent?.prenom)} ${reparerTexte(adherent?.nom)}`.replace(/\s+/g, ' ').trim();
}

// Minuscules, sans accents ni espaces autour : pour comparer des en-têtes de
// colonnes ou des réponses de formulaire.
export function normaliser(valeur) {
  return String(valeur || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Case cochée dans un tableur : « oui », « vrai », « x », « 1 » ou « true ».
export function versBool(valeur) {
  const n = normaliser(valeur);
  return n === 'oui' || n === 'true' || n === '1' || n === 'x' || n === 'vrai';
}

// Clé de tri : texte réparé, sans espaces superflus.
function cleDeTri(valeur) {
  return reparerTexte(valeur).replace(/\s+/g, ' ').trim();
}

// Tri alphabétique français par nom puis prénom, sans tenir compte
// de la casse ni des accents (« Đặng » avec les D, « dana » avec les D).
export function comparerParNom(a, b) {
  const options = { sensitivity: 'base' };
  return (
    cleDeTri(a?.nom).localeCompare(cleDeTri(b?.nom), 'fr', options) ||
    cleDeTri(a?.prenom).localeCompare(cleDeTri(b?.prenom), 'fr', options)
  );
}
