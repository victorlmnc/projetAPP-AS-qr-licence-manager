import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import StatusBanner from '../components/StatusBanner';
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
    // Le scanner peut déjà être arrêté.
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

    const { data, error } = await supabase
      .from('adherents')
      .select('*')
      .eq('public_token', identifiant)
      .maybeSingle();

    if (error || !data) {
      setErreur('Adhérent introuvable ou QR invalide.');
      return;
    }

    setAdherent(data);
  }, []);

  // S'abonner aux changements en temps réel de l'adhérent affiché
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
            setErreur('Cet adhérent a été supprimé de la base de données.');
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
            setCameraMessage('Caméra active : présentez le QR code devant l\'objectif.');
          })
          .catch(async () => {
            await nettoyerScanner(scanner);
            if (!annule && generation === generationScannerRef.current) {
              setScanActif(false);
              setCameraMessage('Caméra indisponible.');
              setErreur(
                "Impossible d'accéder à la caméra. Vérifiez l'autorisation navigateur et l'accès HTTPS."
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

  return (
    <div className="page">
      <Header titre="Scan terrain" />

      <main className="container scan-page">
        <div className="scan-heading">
          <h2>Scanner une licence</h2>
          <p className="muted">
            Visez le QR code de l'adhérent. La caméra se coupe automatiquement après lecture.
          </p>
        </div>

        <section className="scan-reader" aria-label="Scanner QR code">
          <div id={READER_ID} className="scan-reader__camera" />
          <p className="scan-reader__status">{cameraMessage}</p>
        </section>

        {texteLu && (
          <p className="scan-token">
            Identifiant lu : <code>{texteLu}</code>
          </p>
        )}

        {erreur && <p className="error">{erreur}</p>}

        {adherent && (
          <section className="scan-result" aria-live="polite">
            <div className="scan-result__identity">
              <span className="muted">Adhérent contrôlé</span>
              <strong>
                {nomComplet(adherent)}
              </strong>
              {adherent.email && <span>{adherent.email}</span>}
            </div>

            <StatusBanner adherent={adherent} />
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
