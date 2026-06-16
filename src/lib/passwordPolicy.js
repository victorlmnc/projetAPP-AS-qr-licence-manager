/**
 * Validation de mot de passe — politique de sécurité AS INSA CVL.
 *
 * Critères :
 *  - ≥ 8 caractères
 *  - Au moins 1 majuscule
 *  - Au moins 1 minuscule
 *  - Au moins 1 chiffre
 *  - Au moins 1 caractère spécial
 *  - Ne contient pas de mots interdits liés au contexte
 */

const MOTS_INTERDITS = [
  'as',
  'insa',
  'cvl',
  'bureau',
  'coach',
  'login',
  'licence',
  'password',
  'motdepasse',
  '2024',
  '2025',
  '2026',
  '2027',
];

/**
 * Retourne la liste des règles avec leur statut (ok / ko).
 * @param {string} mdp
 * @returns {{ cle: string, libelle: string, ok: boolean }[]}
 */
export function verifierRegles(mdp) {
  const v = mdp ?? '';
  const lower = v.toLowerCase();

  return [
    {
      cle: 'longueur',
      libelle: 'Au moins 8 caractères',
      ok: v.length >= 8,
    },
    {
      cle: 'majuscule',
      libelle: 'Au moins 1 lettre majuscule',
      ok: /[A-Z]/.test(v),
    },
    {
      cle: 'minuscule',
      libelle: 'Au moins 1 lettre minuscule',
      ok: /[a-z]/.test(v),
    },
    {
      cle: 'chiffre',
      libelle: 'Au moins 1 chiffre',
      ok: /[0-9]/.test(v),
    },
    {
      cle: 'special',
      libelle: 'Au moins 1 caractère spécial (!@#$%…)',
      ok: /[^A-Za-z0-9]/.test(v),
    },
    {
      cle: 'blacklist',
      libelle: 'Ne doit pas contenir de mots courants (as, insa, bureau…)',
      ok: v.length === 0 || !MOTS_INTERDITS.some((mot) => lower.includes(mot)),
    },
  ];
}

/**
 * Valide un mot de passe. Renvoie `null` si valide,
 * ou un message d'erreur si invalide.
 * @param {string} mdp
 * @returns {string|null}
 */
export function validerMotDePasse(mdp) {
  const regles = verifierRegles(mdp);
  const echecs = regles.filter((r) => !r.ok);

  if (echecs.length === 0) return null;

  return 'Le mot de passe ne respecte pas les critères :\n' +
    echecs.map((r) => `• ${r.libelle}`).join('\n');
}
