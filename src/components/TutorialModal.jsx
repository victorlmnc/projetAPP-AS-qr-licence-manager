import { useId, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

const SECTIONS_BUREAU = [
  {
    titre: `Fonctionnement du système`,
    images: [],
    contenu: [
      `Attention, l'application ne s'occupe pas des inscriptions ou des paiements. Vous continuez à utiliser Forms ou HelloAsso pour ça.`,
      `Ce site sert juste à regrouper toutes vos données au même endroit. Il génère les QR Codes pour chaque adhérent et permet de vérifier facilement qui est en règle avant un entraînement.`,
      `Il n'y a que deux comptes à retenir. Le compte "bureau" pour gérer tout le monde et envoyer les e-mails, et le compte "respos-sports" pour scanner les QR Codes sur le terrain.`
    ],
  },
  {
    titre: `Gestion des adhérents`,
    images: [],
    contenu: [
      `Pour modifier le dossier de quelqu'un, cliquez sur sa ligne dans le tableau.`,
      `Les changements sont pris en compte quand vous cliquez sur Enregistrer. Si vous fermez la fiche avant, l'application vous demande si vous voulez abandonner vos modifications.`,
      `La barre de recherche et les filtres sont là pour vous faire gagner du temps si vous cherchez une personne en particulier.`,
      `Et si vous avez beaucoup de monde à ajouter, utilisez l'import CSV avec votre fichier Excel.`
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
      `L'application peut envoyer ces trois e-mails automatiquement :`,
      `1. Le premier envoie le QR Code quand tout est en règle.`,
      `2. Le deuxième envoie le QR Code mais prévient que le dossier est incomplet.`,
      `3. Le dernier est une simple piqûre de rappel pour ceux qui n'ont pas encore tout donné.`
    ],
  },
  {
    titre: `Sécurité et outils`,
    images: [],
    contenu: [
      `Vous pouvez changer les mots de passe des deux comptes depuis les paramètres.`,
      `À la fin de la saison, n'oubliez pas d'utiliser le bouton pour vider la base et repartir à zéro.`,
      `Un petit conseil : utilisez le bouton Installer dans le menu pour avoir l'application directement sur votre écran, comme une vraie appli mobile.`
    ],
  },
  {
    titre: `Aide et contact`,
    images: [],
    contenu: [
      `Si quelque chose ne marche pas, s'il y a un bug, ou si vous avez une super idée pour améliorer le site, envoyez-nous un petit mail :`,
      `mathis.hiron@insa-cvl.fr`,
      `victor.lemanceau@insa-cvl.fr`,
      `gabin.pasquier--menard@insa-cvl.fr`
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scan terrain`,
    images: [],
    contenu: [
      `Attention, cette application sert juste à vérifier si la personne a le droit de s'entraîner. Elle ne sert pas à faire l'appel.`,
      `Il suffit de pointer la caméra de votre téléphone vers le QR Code de l'adhérent.`,
      `L'écran devient vert si tout est bon, ou rouge si son dossier n'est pas terminé (et ça vous dira ce qu'il manque).`,
    ],
  },
  {
    titre: `Conseils pratiques`,
    images: [],
    contenu: [
      `C'est exactement comme un contrôleur dans le train : l'adhérent montre son téléphone, et vous scannez.`,
      `Pensez à utiliser le bouton Installer dans le menu. L'application se mettra sur votre écran d'accueil, ça ira beaucoup plus vite pour le prochain entraînement.`,
    ],
  },
  {
    titre: `Aide et contact`,
    images: [],
    contenu: [
      `En cas de souci technique ou si vous avez une idée, le mieux est d'en parler directement à un membre du bureau.`,
    ],
  },
];

export default function TutorialModal({ onClose }) {
  const { role } = useAuth();
  const [sectionOuverte, setSectionOuverte] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);
  const titreId = useId();

  const sections = role === 'coach' ? SECTIONS_COACH : SECTIONS_BUREAU;
  const section = sections[sectionOuverte];

  function changerSection(i) {
    setSectionOuverte(i);
    setImgIndex(0);
  }

  return (
    <Modal onClose={onClose} labelledBy={titreId} className="modal tuto-modal">
      {/* SIDEBAR NAVIGATION */}
      <div className="tuto-sidebar">
        <h3 id={titreId}>Tutoriel {role === 'coach' ? 'respos-sports' : 'Bureau'}</h3>
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
        
        {section.images.length > 0 && (
          <div className="tuto-media">
            {section.images.length > 1 && (
              <div className="tuto-media__nav">
                <button
                  type="button"
                  className="btn-ghost btn-petit"
                  disabled={imgIndex === 0}
                  onClick={() => setImgIndex(i => i - 1)}
                  aria-label="Image précédente"
                >
                  ←
                </button>
                <span className="tuto-media__compteur">
                  {imgIndex + 1} / {section.images.length}
                </span>
                <button
                  type="button"
                  className="btn-ghost btn-petit"
                  disabled={imgIndex === section.images.length - 1}
                  onClick={() => setImgIndex(i => i + 1)}
                  aria-label="Image suivante"
                >
                  →
                </button>
              </div>
            )}

            <div className="tuto-media__cadre">
              <img
                key={`${sectionOuverte}-${imgIndex}`}
                src={section.images[imgIndex] || ''}
                alt={`Illustration pour ${section.titre}`}
                onLoad={(e) => {
                  e.target.style.display = 'block';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="tuto-media__absente">
                Écran : {section.titre} {section.images.length > 1 ? `(${imgIndex + 1})` : ''}
                <span>(Image introuvable : {section.images[imgIndex]})</span>
              </div>
            </div>
          </div>
        )}

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
            onClick={() => {
              if (sectionOuverte === sections.length - 1) onClose();
              else changerSection(sectionOuverte + 1);
            }}
          >
            {sectionOuverte === sections.length - 1 ? 'Terminer' : 'Suivant →'}
          </button>
        </div>

      </div>
    </Modal>
  );
}
