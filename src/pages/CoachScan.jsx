import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import StatusBanner from '../components/StatusBanner';

// La recherche en base et l'affichage du bandeau sont DÉJÀ prêts.
// ====== À CONSTRUIRE — Personne 4 ======
// Intégrer le scanner caméra (html5-qrcode) dans la zone "reader",
// puis appeler chercherAdherent(id) avec l'identifiant lu dans le QR.
export default function CoachScan() {
  const [adherent, setAdherent] = useState(null);
  const [erreur, setErreur] = useState(null);

  // Le QR encode l'identifiant (UUID) de l'adhérent.
  async function chercherAdherent(id) {
    setErreur(null);
    setAdherent(null);

    const { data, error } = await supabase
      .from('adherents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      setErreur('Adhérent introuvable ou QR invalide.');
      return;
    }
    setAdherent(data);
  }

  return (
    <div className="page">
      <Header titre="Scan terrain" />

      <main className="container">
        <h2>Scanner une licence</h2>
        <p className="muted">
          Zone à construire (Personne 4) : brancher la caméra puis appeler{' '}
          <code>chercherAdherent(id)</code>.
        </p>

        {/* Personne 4 : insérer ici la zone caméra, ex. <div id="reader" /> */}

        {erreur && <p className="error">{erreur}</p>}
        {adherent && <StatusBanner adherent={adherent} />}
      </main>
    </div>
  );
}
