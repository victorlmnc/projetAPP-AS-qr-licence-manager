import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { calculerStatutLicence } from '../lib/licence';
import { nomComplet } from '../lib/texte';
import './CoachScan.css';

const READER_ID = 'reader';

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
  const [adherent, setAdherent] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [cameraMessage, setCameraMessage] = useState('Initialisation de la camera...');
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

    const { data, error } = await supabase
      .from('adherents')
      .select('*')
      .eq('public_token', identifiant)
      .maybeSingle();

    if (error || !data) {
      setErreur('Adherent introuvable ou QR invalide.');
      return;
    }

    setAdherent(data);
  }, []);

  useEffect(() => {
    if (!adherent?.id) return;

    const canal = supabase
      .channel('adherent_coach_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adherents' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.id === adherent.id) {
            setAdherent(payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old.id === adherent.id) {
            setAdherent(null);
            setErreur('Cet adherent a ete supprime de la base de donnees.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [adherent?.id]);

  useEffect(() => {
    let annule = false;
    let scanner = null;
    let demarrage = Promise.resolve();
    const generation = generationScannerRef.current + 1;

    generationScannerRef.current = generation;
    lectureEnCoursRef.current = false;
    setScanActif(false);
    setCameraMessage('Initialisation de la camera...');

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
              setCameraMessage('QR code lu. Recherche en cours...');
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
            setCameraMessage("Camera active : presentez le QR code devant l'objectif.");
          })
          .catch(async () => {
            await nettoyerScanner(scanner);
            if (!annule && generation === generationScannerRef.current) {
              setScanActif(false);
              setCameraMessage('Camera indisponible.');
              setErreur(
                "Impossible d'acceder a la camera. Verifiez l'autorisation navigateur et l'acces HTTPS."
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
  }, [chercherAdherent, scanKey]);

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
            Scanner les QR code un par un. Si le scanneur ne s'affiche pas, rechargez la page.
          </p>
        </div>

        {scannerVisible && (
          <section className="scan-reader" aria-label="Scanner QR code">
            <div id={READER_ID} className="scan-reader__camera" />
            <p className="scan-reader__status">{cameraMessage}</p>
          </section>
        )}

        {texteLu && !adherent && !erreur && (
          <p className="scan-reader__status">Recherche en cours...</p>
        )}

        {erreur && <p className="error scan-error">{erreur}</p>}

        {adherent && statut && (
          <section className={`scan-result ${statut.valide ? 'scan-result--ok' : 'scan-result--ko'}`} aria-live="polite">
            <div className="scan-result__main">
              <span className="scan-result__label">Adherent controle</span>
              <h2>{nomComplet(adherent)}</h2>
              <p className="scan-result__status-big">
                {statut.valide ? 'Licence a jour' : 'Licence non a jour'}
              </p>
            </div>

            {!statut.valide && (
              <ul className="scan-result__list">
                {statut.anomalies.map((motif, i) => (
                  <li key={i}>{motif}</li>
                ))}
              </ul>
            )}
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
