import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { calculerStatutLicence, recapitulatifLicence } from '../lib/licence';
import { publicAdherentUrl } from '../lib/publicAccess';
import { nomComplet, reparerTexte } from '../lib/texte';
import { useTitrePage } from '../lib/useTitrePage';
import { adherentScanneDeTest } from '../dev/donneesTest';
import { useJeuDeTest } from '../dev/SelecteurDonnees';

async function chargerAdherentPublic(token) {
  const res = await fetch(`/api/public-adherent?token=${encodeURIComponent(token)}`);
  const contentType = res.headers.get('content-type') || '';

  if (res.ok && contentType.includes('application/json')) {
    return res.json();
  }

  if (!import.meta.env.DEV) {
    const body = contentType.includes('application/json') ? await res.json() : {};
    throw new Error(body.error || 'Aucun adhérent trouvé pour ce QR Code.');
  }

  // En dev Vite simple, les fonctions Vercel /api ne tournent pas.
  // Fallback local limité aux mêmes champs publics.
  const { data, error } = await supabase
    .from('adherents')
    .select('public_token, nom, prenom, types_licence, questionnaire_sante_ok, paiement_global, manque_paiement, manque_yeps, licence_ffsu_a_jour, activite_contraintes')
    .eq('public_token', token)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Aucun adhérent trouvé pour ce QR Code.');
  }

  return data;
}

export default function AdherentPublic() {
  const { token } = useParams();
  useTitrePage('Ma licence');
  const [adherent, setAdherent] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const qrRef = useRef(null);
  // Développement uniquement : adhérent de test (?data=…) à la place de l'API.
  const jeuTest = useJeuDeTest();

  useEffect(() => {
    if (import.meta.env.DEV && jeuTest) {
      const simule = adherentScanneDeTest(jeuTest);
      setAdherent(simule);
      setErreur(simule ? null : 'Aucun adhérent trouvé pour ce QR Code.');
      setChargement(false);
      return undefined;
    }

    let annule = false;

    async function charger() {
      setChargement(true);
      setErreur(null);
      try {
        const data = await chargerAdherentPublic(token);
        if (!annule) setAdherent(data);
      } catch (err) {
        if (!annule) setErreur(err.message);
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => {
      annule = true;
    };
  }, [token, jeuTest]);

  function telechargerQr() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const lien = document.createElement('a');
    lien.href = canvas.toDataURL('image/png');
    lien.download = `qr-licence-${reparerTexte(adherent.nom)}-${reparerTexte(adherent.prenom)}.png`;
    lien.click();
  }

  if (chargement) {
    return (
      <div className="pub-page">
        <p className="centered">Chargement…</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="pub-page">
        <div className="pub-card">
          <p className="error pub-error">{erreur}</p>
        </div>
      </div>
    );
  }

  const lienPublic = publicAdherentUrl(adherent);
  const statut = calculerStatutLicence(adherent);

  return (
    <div className="pub-page">
      <div className="pub-card">
        <div className="pub-header pub-header--center">
          <img src="/logo.png" alt="Logo AS" className="pub-logo" />
          <p className="muted pub-sub">Association Sportive INSA CVL</p>
          <p className="muted pub-sub">Campus de Bourges</p>
        </div>

        <div className="pub-identity">
          <span className="pub-label">Licence de</span>
          <h1 className="pub-name">{nomComplet(adherent)}</h1>
        </div>

        <div className="pub-qr" ref={qrRef}>
          <QRCodeCanvas value={lienPublic} size={210} />
        </div>

        <p className="muted pub-hint">
          Présentez ce QR Code à votre Responsable Sport lors des entraînements.
        </p>

        {/* Même présentation que dans les emails. */}
        <div className="pub-statut">
          <p className="pub-statut__titre">
            {statut.valide ? 'Votre dossier est complet et à jour.' : 'Votre dossier est incomplet.'}
          </p>
          {!statut.valide && (
            <>
              <ul>
                {statut.anomalies.map((anomalie) => (
                  <li key={anomalie}>{anomalie}</li>
                ))}
              </ul>
              <p className="pub-statut__contact">
                Rapprochez-vous du bureau de l'AS pour le régulariser :{' '}
                <a href="mailto:asso.sportive-bourges@insa-cvl.fr">asso.sportive-bourges@insa-cvl.fr</a>
              </p>
            </>
          )}
        </div>

        <section className="pub-licence" aria-labelledby="pub-licence-titre">
          <h2 id="pub-licence-titre">Votre licence</h2>
          <dl className="pub-recap">
            {recapitulatifLicence(adherent).map(([libelle, valeur]) => (
              <div key={libelle} className="pub-recap__ligne">
                <dt>{libelle}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
        </section>

        <button className="btn-ghost pub-dl" onClick={telechargerQr}>
          Télécharger le QR Code
        </button>
      </div>
    </div>
  );
}
