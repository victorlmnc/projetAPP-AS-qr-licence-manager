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
  return `${reparerTexte(adherent?.prenom)} ${reparerTexte(adherent?.nom)}`.trim();
}
