import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SECTIONS_BUREAU = [
  {
    titre: `Tableau de bord`,
    contenu: [
      `Filtrez par statut ("À jour", "Manques") pour repérer rapidement les dossiers incomplets.`,
      `Utilisez la barre de recherche dynamique pour trouver un adhérent instantanément.`,
    ],
  },
  {
    titre: `Gestion Adhérents`,
    contenu: [
      `Ajoutez un membre manuellement via le bouton "+ Nouvel adhérent".`,
      `Importez une liste via CSV (nom, prénom, email) pour les groupes. Les modifications sont immédiates.`,
      `Modifiez un statut d'un simple clic en ouvrant la fiche de l'adhérent.`,
    ],
  },
  {
    titre: `Communication`,
    contenu: [
      `"Envoyer les QR par email" : distribue un lien personnel vers le QR code à tous les inscrits.`,
      `"Relancer non à jour" : envoie un email ciblé uniquement aux personnes dont le dossier est incomplet.`,
    ],
  },
  {
    titre: `Sécurité & Accès`,
    contenu: [
      `Modifiez les mots de passe partagés (Bureau et respos-sports) depuis les Paramètres.`,
      `En fin d'année, utilisez "Réinitialiser les adhérents" pour vider la base (action protégée par mot de passe).`,
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scan Terrain`,
    contenu: [
      `Pointez la caméra vers le QR code de l'adhérent.`,
      `Le résultat s'affiche de suite : Vert (Tout est en ordre) ou Rouge (Alerte, détails des manques affichés).`,
    ],
  },
  {
    titre: `Conseils`,
    contenu: [
      `Acceptez l'accès à la caméra demandé par votre navigateur.`,
      `Sur téléphone, utilisez le bouton "Installer" pour ajouter l'application à votre écran d'accueil.`,
    ],
  },
];

export default function TutorialModal({ onClose }) {
  const { role } = useAuth();
  const [sectionOuverte, setSectionOuverte] = useState(0);

  const sections = role === 'coach' ? SECTIONS_COACH : SECTIONS_BUREAU;
  const section = sections[sectionOuverte];

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
                onClick={() => setSectionOuverte(i)}
              >
                {s.titre}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="tuto-body">
          
          <div className="tuto-placeholder">
            📸 Screen : {section.titre}
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
              onClick={() => setSectionOuverte((s) => s - 1)}
            >
              ← Précédent
            </button>
            <button
              type="button"
              className={sectionOuverte === sections.length - 1 ? "btn-danger" : ""}
              onClick={() => {
                if (sectionOuverte === sections.length - 1) onClose();
                else setSectionOuverte((s) => s + 1);
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
