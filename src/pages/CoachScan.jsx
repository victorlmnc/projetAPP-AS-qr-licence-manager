import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet } from '../lib/texte';
import { useTitrePage } from '../lib/useTitrePage';
import { adherentScanneDeTest } from '../dev/donneesTest';
import { useJeuDeTest } from '../dev/SelecteurDonnees';
import './CoachScan.css';

const READER_ID = 'reader';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Le coach n'a pas acces au temps reel : on relit la fiche affichee a intervalle regulier.
const ACTUALISATION_MS = 10000;

// Lecture limitee aux champs du statut, via la fonction SQL scanner_adherent.
function lireAdherentScanne(token) {
  return supabase.rpc('scanner_adherent', { p_token: token }).maybeSingle();
}

function extraireIdentifiantQr(texteLu) {
  const valeur = texteLu.trim();

  try {
    const url = new URL(valeur);
    const depuisParams =
      url.searchParams.get('id') ||
      url.searchParams.get('token');

    if (depuisParams) return depuisParams.trim();

    const segments = url.pathname.split('/').filter(Boolean);
    return segments.at(-1)?.trim() || valeur;
  } catch {
    return valeur;
  }
}

async function nettoyerScanner(scanner) {
  if (!scanner) return;

  try {
    await scanner.stop();
  } catch {
    // Le scanner peut deja etre arrete.
  }

  try {
    const resultat = scanner.clear();
    if (resultat?.catch) await resultat.catch(() => {});
  } catch {
    // Nettoyage best-effort.
  }
}

export default function CoachScan() {
  useTitrePage('Scan');
  const [adherent, setAdherent] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [cameraMessage, setCameraMessage] = useState('Initialisation de la caméra…');
  const [texteLu, setTexteLu] = useState('');
  const [scanActif, setScanActif] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const scannerRef = useRef(null);
  const generationScannerRef = useRef(0);
  const lectureEnCoursRef = useRef(false);

  const chercherAdherent = useCallback(async (id) => {
    setErreur(null);
    setAdherent(null);

    const identifiant = id.trim();
    if (!identifiant) {
      setErreur('QR invalide : aucun identifiant lu.');
      return;
    }

    if (!UUID_RE.test(identifiant)) {
      setErreur('Adhérent introuvable ou QR invalide.');
      return;
    }

    const { data, error } = await lireAdherentScanne(identifiant);

    if (error || !data) {
      setErreur('Adhérent introuvable ou QR invalide.');
      return;
    }

    setAdherent(data);
  }, []);

  // Développement uniquement : résultat de scan simulé (?data=…), sans caméra.
  const jeuTest = useJeuDeTest();

  useEffect(() => {
    if (!import.meta.env.DEV || !jeuTest) return;
    const simule = adherentScanneDeTest(jeuTest);
    setTexteLu(simule ? simule.public_token : 'qr-inconnu');
    setAdherent(simule);
    setErreur(simule ? null : 'Adhérent introuvable ou QR invalide.');
  }, [jeuTest]);

  useEffect(() => {
    const token = adherent?.public_token;
    if (!token || jeuTest) return;

    const timer = setInterval(async () => {
      const { data, error } = await lireAdherentScanne(token);
      if (error) return;
      if (!data) {
        setAdherent(null);
        setErreur('Cet adhérent a été supprimé de la base de données.');
        return;
      }
      setAdherent(data);
    }, ACTUALISATION_MS);

    return () => clearInterval(timer);
  }, [adherent?.public_token]);

  useEffect(() => {
    if (import.meta.env.DEV && jeuTest) return undefined;

    let annule = false;
    let scanner = null;
    let demarrage = Promise.resolve();
    const generation = generationScannerRef.current + 1;

    generationScannerRef.current = generation;
    lectureEnCoursRef.current = false;
    setScanActif(false);
    setCameraMessage('Initialisation de la caméra…');

    async function lancerScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (annule || generation !== generationScannerRef.current) return;

        scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;

        demarrage = scanner
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (resultat) => {
              if (lectureEnCoursRef.current) return;
              if (annule || generation !== generationScannerRef.current) return;
              lectureEnCoursRef.current = true;

              const identifiant = extraireIdentifiantQr(resultat);
              setTexteLu(identifiant);
              setCameraMessage('QR code lu. Recherche en cours…');
              setScanActif(false);

              await nettoyerScanner(scanner);
              if (!annule && generation === generationScannerRef.current) {
                await chercherAdherent(identifiant);
              }
            },
            () => {}
          )
          .then(async () => {
            if (annule || generation !== generationScannerRef.current) {
              await nettoyerScanner(scanner);
              return;
            }
            setScanActif(true);
            setCameraMessage("Caméra active : présentez le QR code devant l'objectif.");
          })
          .catch(async () => {
            await nettoyerScanner(scanner);
            if (!annule && generation === generationScannerRef.current) {
              setScanActif(false);
              setCameraMessage('Caméra indisponible.');
              setErreur(
                "Impossible d'accéder à la caméra. Vérifiez l'autorisation du navigateur et l'accès HTTPS."
              );
            }
          });
      } catch {
        if (!annule && generation === generationScannerRef.current) {
          setErreur('Le module de scan QR est indisponible.');
          setScanActif(false);
          setCameraMessage('Scanner indisponible.');
        }
        if (scanner) {
          await nettoyerScanner(scanner);
        }
      }
    }

    lancerScanner();

    return () => {
      annule = true;
      generationScannerRef.current += 1;
      if (scannerRef.current === scanner) scannerRef.current = null;
      demarrage.finally(() => nettoyerScanner(scanner));
    };
  }, [chercherAdherent, scanKey, jeuTest]);

  function scannerUnAutre() {
    setAdherent(null);
    setErreur(null);
    setTexteLu('');
    setScanKey((key) => key + 1);
  }

  const scannerVisible = !texteLu && !adherent && !erreur;
  const statut = adherent ? calculerStatutLicence(adherent) : null;

  return (
    <div className="page">
      <Header titre="Scan terrain" />

      <main className="container scan-page">
        <div className="scan-heading">
          <h2>Scanner une licence</h2>
          <p className="muted">
            Scannez les QR codes un par un. Si le scanner ne s'affiche pas, rechargez la page.
          </p>
        </div>

        {scannerVisible && (
          <section className="scan-reader" aria-label="Scanner de QR code">
            <div id={READER_ID} className="scan-reader__camera" />
            <p className="scan-reader__status" role="status">{cameraMessage}</p>
          </section>
        )}

        {texteLu && !adherent && !erreur && (
          <p className="scan-reader__status" role="status">Recherche en cours…</p>
        )}

        {erreur && <p className="error scan-error" role="alert">{erreur}</p>}

        {adherent && statut && (
          <section className={`scan-result ${statut.valide ? 'scan-result--ok' : 'scan-result--ko'}`} aria-live="polite">
            <div className="scan-result__main">
              <span className="scan-result__label">Adhérent contrôlé</span>
              <h2>{nomComplet(adherent)}</h2>
              <p className="scan-result__status-big">
                {statut.valide ? 'Licence à jour' : 'Licence non à jour'}
              </p>
            </div>

            {!statut.valide && (
              <ul className="scan-result__list">
                {statut.anomalies.map((motif, i) => (
                  <li key={i}>{motif}</li>
                ))}
              </ul>
            )}

            <div className="scan-result__badges">
              <span className={`scan-result__badge ${adherent.licence_ffsu_a_jour ? 'scan-result__badge--ok' : 'scan-result__badge--no'}`}>
                {adherent.licence_ffsu_a_jour ? '✓' : '✗'} Licence FFSU
              </span>
              <span className={`scan-result__badge ${adherent.activite_contraintes ? 'scan-result__badge--ok' : 'scan-result__badge--no'}`}>
                {adherent.activite_contraintes ? '✓' : '✗'} Activités à contraintes
              </span>
            </div>
          </section>
        )}

        <div className="scan-actions">
          <button type="button" onClick={scannerUnAutre}>
            {scanActif ? 'Relancer le scanner' : 'Scanner un autre'}
          </button>
        </div>
      </main>
    </div>
  );
}
