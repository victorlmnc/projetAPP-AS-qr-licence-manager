import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Chaque section contient un titre, un contenu textuel,
 * et une image optionnelle (chemin dans /tuto/).
 * L'utilisateur doit placer ses screenshots dans public/tuto/.
 */
const SECTIONS_BUREAU = [
  {
    titre: `Vue d'ensemble`,
    image: '/tuto/dashboard.png',
    contenu: [
      `Le tableau de bord affiche tous les adhérents avec leur statut de licence.`,
      `Les statistiques en haut montrent le nombre total d'adhérents, ceux à jour et ceux non à jour.`,
      `Utilisez la barre de recherche pour trouver rapidement un adhérent par nom ou prénom.`,
      `Les filtres permettent de filtrer par statut : "À jour", "Non à jour", "Fiche manquante", etc. Vous pouvez combiner plusieurs filtres.`,
    ],
  },
  {
    titre: `Ajouter un adhérent`,
    image: '/tuto/ajout-adherent.png',
    contenu: [
      `Cliquez sur le bouton "+ Nouvel adhérent" en haut du tableau.`,
      `Remplissez le formulaire avec les informations de l'adhérent : nom, prénom, email (optionnel).`,
      `Cochez les cases correspondantes : fiche de renseignement reçue, paiement global, manques éventuels.`,
      `Cliquez sur "Enregistrer" pour valider.`,
    ],
  },
  {
    titre: `Importer un CSV`,
    image: '/tuto/import-csv.png',
    contenu: [
      `Cliquez sur "Importer CSV" pour importer plusieurs adhérents en une fois.`,
      `Le fichier CSV doit contenir les colonnes : nom, prenom, email (séparées par des points-virgules ou des virgules).`,
      `L'import ajoute les nouveaux adhérents sans supprimer les existants.`,
      `Un résumé s'affiche à la fin avec le nombre d'adhérents importés.`,
    ],
  },
  {
    titre: `Modifier / Supprimer un adhérent`,
    image: '/tuto/modifier-adherent.png',
    contenu: [
      `Cliquez sur "Modifier" à côté d'un adhérent pour ouvrir son dossier.`,
      `Vous pouvez modifier toutes ses informations et cocher/décocher les cases de statut.`,
      `Pour supprimer un adhérent, cliquez sur "Supprimer" en bas du formulaire. Une confirmation sera demandée.`,
    ],
  },
  {
    titre: `QR Code`,
    image: '/tuto/qr-code.png',
    contenu: [
      `Chaque adhérent possède un QR code unique lié à sa fiche.`,
      `Cliquez sur "QR Code" à côté d'un adhérent pour le visualiser.`,
      `Vous pouvez télécharger le QR code en image ou copier le lien.`,
      `Ce QR code est celui que le Responsable Sport scannera pour vérifier la licence.`,
    ],
  },
  {
    titre: `Envoyer les emails`,
    image: '/tuto/envoi-emails.png',
    contenu: [
      `"Envoyer les QR par email" envoie un email à chaque adhérent ayant une adresse email. L'email contient un lien vers son QR code personnel.`,
      `"Relancer non à jour" envoie un email de relance uniquement aux adhérents dont la licence est incomplète, en leur détaillant ce qui manque.`,
      `Vous pouvez sélectionner/désélectionner individuellement les destinataires avant l'envoi.`,
      `Un rapport s'affiche à la fin avec le nombre d'emails envoyés et les éventuelles erreurs.`,
    ],
  },
  {
    titre: `Exporter en CSV`,
    image: null,
    contenu: [
      `Le bouton "Exporter en CSV" exporte la liste actuellement affichée (avec les filtres actifs).`,
      `Le fichier téléchargé contient toutes les colonnes : nom, prénom, email, statut, détails, etc.`,
      `Utile pour des rapports ou pour traiter les données dans un tableur.`,
    ],
  },
  {
    titre: `Paramètres`,
    image: '/tuto/parametres.png',
    contenu: [
      `"Modifier mon mot de passe" : changez le mot de passe du compte bureau. Le mot de passe doit respecter une politique de sécurité stricte.`,
      `"Modifier le mot de passe du Responsable Sport" : réinitialisez le mot de passe du compte Responsable Sport partagé si nécessaire.`,
      `"Réinitialiser les adhérents" : supprime toutes les fiches adhérents. Action irréversible nécessitant votre mot de passe.`,
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scanner une licence`,
    image: '/tuto/scan-coach.png',
    contenu: [
      `La caméra s'active automatiquement à l'ouverture de la page.`,
      `Pointez la caméra vers le QR code de l'adhérent.`,
      `Le résultat s'affiche immédiatement : licence à jour (vert) ou non à jour (rouge) avec le détail des manques.`,
      `Cliquez sur "Scanner un autre" pour vérifier un autre adhérent.`,
    ],
  },
  {
    titre: `Conseils pratiques`,
    image: null,
    contenu: [
      `Assurez-vous d'avoir autorisé l'accès à la caméra dans votre navigateur.`,
      `L'application fonctionne en HTTPS uniquement (nécessaire pour la caméra).`,
      `Vous pouvez installer l'application sur votre téléphone pour un accès rapide (bouton "Installer").`,
      `En cas de problème de caméra, relancez le scanner ou rafraîchissez la page.`,
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
      <div className="modal modal--wide tuto-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Tutoriel — {role === 'coach' ? 'Espace Responsable Sport' : 'Espace Bureau'}</h3>

        <div className="tuto-nav">
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

        <div className="tuto-content">
          <h4 className="tuto-content__title">{section.titre}</h4>

          {section.image && (
            <div className="tuto-image-wrap">
              <img
                src={section.image}
                alt={`Capture : ${section.titre}`}
                className="tuto-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <ol className="tuto-steps">
            {section.contenu.map((texte, i) => (
              <li key={i} className="tuto-step">{texte}</li>
            ))}
          </ol>
        </div>

        <div className="tuto-footer">
          <div className="tuto-footer__nav">
            <button
              type="button"
              className="btn-ghost"
              disabled={sectionOuverte === 0}
              onClick={() => setSectionOuverte((s) => s - 1)}
            >
              ← Précédent
            </button>
            <span className="tuto-footer__page muted">
              {sectionOuverte + 1} / {sections.length}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={sectionOuverte === sections.length - 1}
              onClick={() => setSectionOuverte((s) => s + 1)}
            >
              Suivant →
            </button>
          </div>
          <button type="button" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
