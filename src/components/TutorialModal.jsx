import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Chaque section contient un titre, un contenu textuel,
 * et une image optionnelle (chemin dans /tuto/).
 * L'utilisateur doit placer ses screenshots dans public/tuto/.
 */
const SECTIONS_BUREAU = [
  {
    titre: `Vue d\u2019ensemble`,
    image: '/tuto/dashboard.png',
    contenu: [
      `Le tableau de bord affiche tous les adh\u00e9rents avec leur statut de licence.`,
      `Les statistiques en haut montrent le nombre total d\u2019adh\u00e9rents, ceux \u00e0 jour et ceux non \u00e0 jour.`,
      `Utilisez la barre de recherche pour trouver rapidement un adh\u00e9rent par nom ou pr\u00e9nom.`,
      `Les filtres permettent de filtrer par statut : "\u00c0 jour", "Non \u00e0 jour", "Fiche manquante", etc. Vous pouvez combiner plusieurs filtres.`,
    ],
  },
  {
    titre: `Ajouter un adh\u00e9rent`,
    image: '/tuto/ajout-adherent.png',
    contenu: [
      `Cliquez sur le bouton "+ Nouvel adh\u00e9rent" en haut du tableau.`,
      `Remplissez le formulaire avec les informations de l\u2019adh\u00e9rent : nom, pr\u00e9nom, email (optionnel).`,
      `Cochez les cases correspondantes : fiche de renseignement re\u00e7ue, paiement global, manques \u00e9ventuels.`,
      `Cliquez sur "Enregistrer" pour valider.`,
    ],
  },
  {
    titre: `Importer un CSV`,
    image: '/tuto/import-csv.png',
    contenu: [
      `Cliquez sur "Importer CSV" pour importer plusieurs adh\u00e9rents en une fois.`,
      `Le fichier CSV doit contenir les colonnes : nom, prenom, email (s\u00e9par\u00e9es par des points-virgules ou des virgules).`,
      `L\u2019import ajoute les nouveaux adh\u00e9rents sans supprimer les existants.`,
      `Un r\u00e9sum\u00e9 s\u2019affiche \u00e0 la fin avec le nombre d\u2019adh\u00e9rents import\u00e9s.`,
    ],
  },
  {
    titre: `Modifier / Supprimer un adh\u00e9rent`,
    image: '/tuto/modifier-adherent.png',
    contenu: [
      `Cliquez sur "Modifier" \u00e0 c\u00f4t\u00e9 d\u2019un adh\u00e9rent pour ouvrir son dossier.`,
      `Vous pouvez modifier toutes ses informations et cocher/d\u00e9cocher les cases de statut.`,
      `Pour supprimer un adh\u00e9rent, cliquez sur "Supprimer" en bas du formulaire. Une confirmation sera demand\u00e9e.`,
    ],
  },
  {
    titre: `QR Code`,
    image: '/tuto/qr-code.png',
    contenu: [
      `Chaque adh\u00e9rent poss\u00e8de un QR code unique li\u00e9 \u00e0 sa fiche.`,
      `Cliquez sur "QR Code" \u00e0 c\u00f4t\u00e9 d\u2019un adh\u00e9rent pour le visualiser.`,
      `Vous pouvez t\u00e9l\u00e9charger le QR code en image ou copier le lien.`,
      `Ce QR code est celui que le coach scannera pour v\u00e9rifier la licence.`,
    ],
  },
  {
    titre: `Envoyer les emails`,
    image: '/tuto/envoi-emails.png',
    contenu: [
      `"Envoyer les QR par email" envoie un email \u00e0 chaque adh\u00e9rent ayant une adresse email. L\u2019email contient un lien vers son QR code personnel.`,
      `"Relancer non \u00e0 jour" envoie un email de relance uniquement aux adh\u00e9rents dont la licence est incompl\u00e8te, en leur d\u00e9taillant ce qui manque.`,
      `Vous pouvez s\u00e9lectionner/d\u00e9s\u00e9lectionner individuellement les destinataires avant l\u2019envoi.`,
      `Un rapport s\u2019affiche \u00e0 la fin avec le nombre d\u2019emails envoy\u00e9s et les \u00e9ventuelles erreurs.`,
    ],
  },
  {
    titre: `Exporter en CSV`,
    image: null,
    contenu: [
      `Le bouton "Exporter en CSV" exporte la liste actuellement affich\u00e9e (avec les filtres actifs).`,
      `Le fichier t\u00e9l\u00e9charg\u00e9 contient toutes les colonnes : nom, pr\u00e9nom, email, statut, d\u00e9tails, etc.`,
      `Utile pour des rapports ou pour traiter les donn\u00e9es dans un tableur.`,
    ],
  },
  {
    titre: `Param\u00e8tres`,
    image: '/tuto/parametres.png',
    contenu: [
      `"Modifier mon mot de passe" : changez le mot de passe du compte bureau. Le mot de passe doit respecter une politique de s\u00e9curit\u00e9 stricte.`,
      `"Modifier le mot de passe du coach" : r\u00e9initialisez le mot de passe du compte coach partag\u00e9 si n\u00e9cessaire.`,
      `"R\u00e9initialiser les adh\u00e9rents" : supprime toutes les fiches adh\u00e9rents. Action irr\u00e9versible n\u00e9cessitant votre mot de passe.`,
    ],
  },
];

const SECTIONS_COACH = [
  {
    titre: `Scanner une licence`,
    image: '/tuto/scan-coach.png',
    contenu: [
      `La cam\u00e9ra s\u2019active automatiquement \u00e0 l\u2019ouverture de la page.`,
      `Pointez la cam\u00e9ra vers le QR code de l\u2019adh\u00e9rent.`,
      `Le r\u00e9sultat s\u2019affiche imm\u00e9diatement : licence \u00e0 jour (vert) ou non \u00e0 jour (rouge) avec le d\u00e9tail des manques.`,
      `Cliquez sur "Scanner un autre" pour v\u00e9rifier un autre adh\u00e9rent.`,
    ],
  },
  {
    titre: `Conseils pratiques`,
    image: null,
    contenu: [
      `Assurez-vous d\u2019avoir autoris\u00e9 l\u2019acc\u00e8s \u00e0 la cam\u00e9ra dans votre navigateur.`,
      `L\u2019application fonctionne en HTTPS uniquement (n\u00e9cessaire pour la cam\u00e9ra).`,
      `Vous pouvez installer l\u2019application sur votre t\u00e9l\u00e9phone pour un acc\u00e8s rapide (bouton "Installer").`,
      `En cas de probl\u00e8me de cam\u00e9ra, relancez le scanner ou rafra\u00eechissez la page.`,
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
        <h3>Tutoriel — {role === 'coach' ? 'Espace Coach' : 'Espace Bureau'}</h3>

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
              {'\u2190'} Pr\u00e9c\u00e9dent
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
              Suivant {'\u2192'}
            </button>
          </div>
          <button type="button" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
