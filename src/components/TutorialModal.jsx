import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SECTIONS_BUREAU = [
  {
    titre: `Tableau de bord`,
    images: ['/tuto/dashboard.png'],
    contenu: [
      `Filtrez par statut ("À jour", "Manques") pour repérer rapidement les dossiers incomplets.`,
      `Utilisez la barre de recherche dynamique pour trouver un adhérent instantanément.`,
    ],
  },
  {
    titre: `Gestion Adhérents`,
    images: ['/tuto/ajout-adherent.png'],
    contenu: [
      `Ajoutez un membre manuellement via le bouton "+ Nouvel adhérent".`,
      `Importez une liste via CSV (nom, prénom, email) pour les groupes. Les modifications sont immédiates.`,
      `Modifiez un statut d'un simple clic en ouvrant la fiche de l'adhérent.`,
    ],
  },
  {
    titre: `Communication`,
    images: [
      '/tuto/envoi-emails-1.png',
      '/tuto/envoi-emails-2.png',
      '/tuto/envoi-emails-3.png',
    ],
    contenu: [
      `"Envoyer les QR par email" : distribue un lien personnel vers le QR code à tous les inscrits.`,
      `"Relancer non à jour" : envoie un email ciblé uniquement aux personnes dont le dossier est incomplet.`,
    ],
  },
  {
    titre: `Sécurité & Accès`,
    images: ['/tuto/parametres.png'],
    contenu: [
      `Modifiez les mots de passe partagés (Bureau et respos-sports) depuis les Paramètres.`,
      `En fin d'année, utilisez "Réinitialiser les adhérents" pour vider la base (action protégée par mot de passe).`,
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scan Terrain`,
    images: ['/tuto/scan-coach.png'],
    contenu: [
      `Pointez la caméra vers le QR code de l'adhérent.`,
      `Le résultat s'affiche de suite : Vert (Tout est en ordre) ou Rouge (Alerte, détails des manques affichés).`,
    ],
  },
  {
    titre: `Conseils`,
    images: ['/tuto/conseils-coach.png'],
    contenu: [
      `Acceptez l'accès à la caméra demandé par votre navigateur.`,
      `Sur téléphone, utilisez le bouton "Installer" pour ajouter l'application à votre écran d'accueil.`,
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
          
          <div className="tuto-media-container" style={{ position: 'relative', marginBottom: '16px' }}>
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
                src={section.images[imgIndex]} 
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
