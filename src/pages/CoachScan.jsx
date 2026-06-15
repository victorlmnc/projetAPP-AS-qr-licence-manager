import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import StatusBanner from '../components/StatusBanner';

async function arreterScanner(scanner) {
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
  const [scanActif, setScanActif] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const scannerRef = useRef(null);
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
      .eq('id', identifiant)
      .single();

    if (error) {
      setErreur('Adhérent introuvable ou QR invalide.');
      return;
    }
    setAdherent(data);
  }, []);

  useEffect(() => {
    let annule = false;
    let scanner = null;
    let demarrage = Promise.resolve();
    lectureEnCoursRef.current = false;
    setScanActif(false);

    async function lancerScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (annule) return;

        scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        demarrage = scanner
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (texteLu) => {
              if (lectureEnCoursRef.current) return;
              lectureEnCoursRef.current = true;
              setScanActif(false);
              await arreterScanner(scanner);
              if (!annule) await chercherAdherent(texteLu);
            },
            () => {}
          )
          .then(async () => {
            if (annule) {
              await arreterScanner(scanner);
              return;
            }
            setScanActif(true);
          })
          .catch(async () => {
            await arreterScanner(scanner);
            if (!annule) {
              setScanActif(false);
              setErreur(
                "Impossible d'accéder à la caméra. Vérifiez l'autorisation navigateur et l'accès HTTPS."
              );
            }
          });
      } catch {
        if (!annule) {
          setErreur('Le module de scan QR est indisponible.');
          setScanActif(false);
        }
        if (scanner) {
          await arreterScanner(scanner);
        }
      }
    }

    lancerScanner();

    return () => {
      annule = true;
      if (scannerRef.current === scanner) scannerRef.current = null;
      demarrage.finally(() => arreterScanner(scanner));
    };
  }, [chercherAdherent, scanKey]);

  function scannerUnAutre() {
    setAdherent(null);
    setErreur(null);
    setScanKey((key) => key + 1);
  }

  return (
    <div className="page">
      <Header titre="Scan terrain" />

      <main className="container">
        <div className="scan-head">
          <h2>Scanner une licence</h2>
          <button className="btn-ghost" type="button" onClick={scannerUnAutre}>
            Scanner un autre
          </button>
        </div>

        <div className="scanner-card">
          <div id="reader" className="scanner-frame" />
          {!scanActif && !adherent && !erreur && (
            <p className="muted scan-status">Initialisation de la caméra…</p>
          )}
        </div>

        {erreur && <p className="error">{erreur}</p>}
        {adherent && <StatusBanner adherent={adherent} />}
      </main>
    </div>
  );
}
