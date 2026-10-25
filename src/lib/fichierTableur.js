// Lecture d'un fichier CSV ou Excel en lignes { "En-tête": "valeur" }.
// PapaParse et xlsx sont chargés seulement au moment de l'import.
// CSV : séparateur « ; » ou « , » détecté, UTF-8 ou Windows-1252 (export Excel).
export async function lireTableur(fichier) {
  if (fichier.name.toLowerCase().endsWith('.xlsx')) {
    const XLSX = await import('xlsx');
    const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array' });
    const feuille = classeur.Sheets[classeur.SheetNames[0]];
    return XLSX.utils.sheet_to_json(feuille, { defval: '', raw: false });
  }

  const { default: Papa } = await import('papaparse');
  const buffer = await fichier.arrayBuffer();
  let texte;
  try {
    texte = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    texte = new TextDecoder('windows-1252').decode(buffer);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(texte, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (entete) => entete.trim(),
      complete: (resultat) => resolve(resultat.data),
      error: reject,
    });
  });
}
