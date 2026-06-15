import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import StatusBanner from '../components/StatusBanner';
import './CoachScan.css';

const READER_ID = 'reader';

function extraireIdentifiantQr(texteLu) {
  const valeur = texteLu.trim();

  try {
    const url = new URL(valeur);
    const depuisParams =
      url.searchParams.get('id') ||
      url.searchParams.get('token') ||
      url.searchParams.get('adherent_id');

    if (depuisParams) return depuisParams.trim();

    const segments = url.pathname.split('/').filter(Boolean);
    return segments.at(-1)?.trim() || valeur;
  } catch {
    return valeur;
  }
}

export default function CoachScan() {
  const [adherent, setAdherent] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [cameraMessage, setCameraMessage] = useState('Ouverture de la camera...');
  const [texteLu, setTexteLu] = useState('');
  const [scanEnCours, setScanEnCours] = useState(false);
  const scannerRef = useRef(null);
  const scannerActifRef = useRef(false);
  const generationScannerRef = useRef(0);
  const qrDejaTraiteRef = useRef(false);

  const chercherAdherent = useCallback(async (id) => {
    setErreur(null);
    setAdherent(null);

    const { data, error } = await supabase
      .from('adherents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      setErreur('Adherent introuvable ou QR invalide.');
      return;
    }

    setAdherent(data);
  }, []);

  const arreterScanner = useCallback(async ({ invalider = true } = {}) => {
    if (invalider) {
      generationScannerRef.current += 1;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;
    scannerActifRef.current = false;
    setScanEnCours(false);

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Le navigateur peut deja avoir coupe le flux camera.
    }

    try {
      scanner.clear();
    } catch {
      // Le nettoyage visuel n'est pas critique si le flux est deja stoppe.
    }

  }, []);

  const demarrerScanner = useCallback(async () => {
    await arreterScanner({ invalider: false });

    const reader = document.getElementById(READER_ID);
    if (!reader) return;

    const generation = generationScannerRef.current + 1;
    generationScannerRef.current = generation;
    qrDejaTraiteRef.current = false;
    setAdherent(null);
    setErreur(null);
    setTexteLu('');
    setCameraMessage('Ouverture de la camera...');

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (resultat) => {
          if (qrDejaTraiteRef.current) return;
          if (generation !== generationScannerRef.current) return;
          qrDejaTraiteRef.current = true;

          const identifiant = extraireIdentifiantQr(resultat);
          setTexteLu(identifiant);
          setCameraMessage('QR code lu. Recherche en cours...');
          await arreterScanner();
          await chercherAdherent(identifiant);
        },
        () => {}
      );

      if (generation !== generationScannerRef.current) {
        try {
          await scanner.stop();
        } catch {
          // Scanner deja stoppe ou jamais completement demarre.
        }
        try {
          scanner.clear();
        } catch {
          // Nettoyage non critique.
        }
        return;
      }

      scannerActifRef.current = true;
      setScanEnCours(true);
      setCameraMessage('Camera active : presentez le QR code devant l objectif.');
    } catch {
      if (generation !== generationScannerRef.current) return;

      scannerRef.current = null;
      scannerActifRef.current = false;
      setScanEnCours(false);
      setCameraMessage('Camera indisponible.');
      setErreur(
        "Impossible d'acceder a la camera. Verifiez l'autorisation du navigateur et utilisez HTTPS sur telephone."
      );
    }
  }, [arreterScanner, chercherAdherent]);

  useEffect(() => {
    demarrerScanner();

    return () => {
      arreterScanner();
    };
  }, [arreterScanner, demarrerScanner]);

  function scannerUnAutre() {
    demarrerScanner();
  }

  return (
    <div className="page">
      <Header titre="Scan terrain" />

      <main className="container scan-page">
        <div className="scan-heading">
          <h2>Scanner une licence</h2>
          <p className="muted">
            Visez le QR code de l'adherent. La camera se coupe automatiquement apres lecture.
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
              <span className="muted">Adherent controle</span>
              <strong>
                {adherent.prenom} {adherent.nom}
              </strong>
              {adherent.email && <span>{adherent.email}</span>}
            </div>

            <StatusBanner adherent={adherent} />
          </section>
        )}

        <div className="scan-actions">
          <button type="button" onClick={scannerUnAutre}>
            {scanEnCours ? 'Relancer le scanner' : 'Scanner un autre'}
          </button>
        </div>
      </main>
    </div>
  );
}
