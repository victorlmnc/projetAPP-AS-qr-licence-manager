import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SECTIONS_BUREAU = [
  {
    titre: `Fonctionnement du système`,
    images: [],
    contenu: [
      `L'application utilise seulement deux comptes partagés : "bureau" (gestion) et "respos-sports" (scan sur le terrain).`,
      `Le bureau gère la base de données et envoie par e-mail un QR Code personnel à chaque adhérent.`,
      `L'adhérent ouvre le lien reçu sur son téléphone et présente son QR Code au responsable sportif avant l'entraînement.`,
      `Le responsable sportif (coach) scanne le QR Code pour vérifier instantanément si la licence est valide ou s'il manque des documents.`
    ],
  },
  {
    titre: `Exemples d'e-mails`,
    images: [
      '/tuto/envoi-emails-1.png',
      '/tuto/envoi-emails-2.png',
      '/tuto/envoi-emails-3.png',
    ],
    contenu: [
      `Voici les trois e-mails que le système peut envoyer :`,
      `1. Le QR Code avec un statut valide (tout est en règle).`,
      `2. Le QR Code avec un statut invalide (liste détaillée de ce qu'il manque).`,
      `3. Une simple relance (sans le QR Code) ciblée uniquement sur les dossiers incomplets.`
    ],
  },
  {
    titre: `Aide : Import CSV`,
    images: ['/tuto/import-csv.png'],
    contenu: [
      `L'importation de groupe se fait via un fichier Excel exporté en format CSV.`,
      `Votre fichier doit impérativement contenir des colonnes nommées : "nom", "prenom", et "email".`,
      `Les autres colonnes seront ignorées, et l'importation mettra à jour la base instantanément.`
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scan Terrain`,
    images: ['/tuto/scan-coach.png'],
    contenu: [
      `Pointez la caméra vers le QR code de l'adhérent.`,
      `Le résultat s'affiche tout de suite : Vert (Tout est en ordre) ou Rouge (Alerte, avec le détail des manques affiché).`,
    ],
  },
  {
    titre: `Conseils Pratiques`,
    images: ['/tuto/conseils-coach.png'],
    contenu: [
      `Le système est comme un billet de train : l'adhérent affiche son QR code sur son écran, et vous le validez.`,
      `Sur téléphone, utilisez le bouton "Installer" dans le menu pour ajouter l'application comme une vraie application sur votre écran d'accueil.`,
    ],
  },
];

export default function TutorialModal({ onClose }) {
  const { role } = useAuth();
  const [sectionOuverte, setSectionOuverte] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);

  const sections = role === 'coach' ? SECTIONS_COACH : SECTIONS_BUREAU;
  const section = sections[sectionOuverte];

  function changerSection(i) {
    setSectionOuverte(i);
    setImgIndex(0);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal tuto-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* SIDEBAR NAVIGATION */}
        <div className="tuto-sidebar">
          <h3>Tutoriel {role === 'coach' ? 'respos-sports' : 'Bureau'}</h3>
          <div className="tuto-nav-vertical">
            {sections.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`tuto-nav__btn ${i === sectionOuverte ? 'tuto-nav__btn--active' : ''}`}
                onClick={() => changerSection(i)}
              >
                {s.titre}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="tuto-body">
          
          <div className="tuto-media-container" style={{ position: 'relative', marginBottom: '16px', display: section.images.length > 0 ? 'block' : 'none' }}>
            {section.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                <button 
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '4px 8px', minWidth: 'auto' }}
                  disabled={imgIndex === 0}
                  onClick={() => setImgIndex(i => i - 1)}
                >
                  ◀
                </button>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  {imgIndex + 1} / {section.images.length}
                </span>
                <button 
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '4px 8px', minWidth: 'auto' }}
                  disabled={imgIndex === section.images.length - 1}
                  onClick={() => setImgIndex(i => i + 1)}
                >
                  ▶
                </button>
              </div>
            )}
            
            <div className="tuto-placeholder" style={{ position: 'relative' }}>
              <img 
                src={section.images[imgIndex] || ''} 
                alt={`Illustration pour ${section.titre}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0 }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0d8eb' }}>
                📸 Screen : {section.titre} {section.images.length > 1 ? `(${imgIndex + 1})` : ''}
              </div>
            </div>
          </div>

          <h4 className="tuto-content__title">{section.titre}</h4>
          
          <ul className="tuto-step-list">
            {section.contenu.map((texte, i) => (
              <li key={i}>{texte}</li>
            ))}
          </ul>

          <div className="tuto-actions">
            <button
              type="button"
              className="btn-ghost"
              disabled={sectionOuverte === 0}
              onClick={() => changerSection(sectionOuverte - 1)}
            >
              ← Précédent
            </button>
            <button
              type="button"
              className={sectionOuverte === sections.length - 1 ? "btn-danger" : ""}
              onClick={() => {
                if (sectionOuverte === sections.length - 1) onClose();
                else changerSection(sectionOuverte + 1);
              }}
            >
              {sectionOuverte === sections.length - 1 ? 'Terminer' : 'Suivant →'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
