# AS INSA CVL : gestion des licences

Application web de gestion des licences de l'Association Sportive de l'INSA CVL (campus de Bourges), en ligne sur [as-licences-insa-cvl.vercel.app](https://as-licences-insa-cvl.vercel.app).

## Fonctionnalités

### Espace bureau

- Liste des adhérents avec statistiques (à jour ou non), filtres et recherche par nom, prénom ou email
- Fiche adhérent, ouverte d'un clic sur la ligne : informations personnelles, adresse, types de licence, rôle, médical, documents et paiement
- Import de l'export CSV de Google Forms (les doubles soumissions sont fusionnées)
- Import complémentaire CSV ou Excel pour mettre à jour certains champs (paiement, YEPS, PASS'SPORT…)
- Export de la liste filtrée en CSV, Excel ou PDF
- Envoi des QR codes par email, à un adhérent ou à plusieurs
- Relance par email des dossiers incomplets
- Modification de plusieurs adhérents à la fois, y compris la remise du merch
- Suivi du merch (maillot avec flocage en option, short) : articles commandés, tailles, texte floqué, remise article par article. Le flocage est remis avec le maillot. Un filtre affiche le merch à remettre, et le récap de commande par taille se télécharge en bon de commande PDF ou en fichier Excel pour le fournisseur, sans nom d'adhérent.
- Import des commandes de merch depuis l'export HelloAsso ou un modèle Excel. Les formules sont reconnues, les colonnes de l'adhérent sont préférées à celles du payeur, les commandes remboursées ou annulées sont ignorées et l'aide YEPS est cochée pour les formules « avec YEPS ». Un aperçu s'affiche avant d'appliquer, et l'import ne fait qu'ajouter ce qui manque.
- Mise à jour en temps réel (Supabase Realtime)
- Paramètres : mots de passe, remise à zéro de la base en fin de saison
- Utilisable sur ordinateur et sur téléphone, où le tableau s'affiche en cartes

### Espace respos-sports

- Scan des QR codes sur le terrain avec la caméra du téléphone
- Résultat immédiat : écran vert si le dossier est à jour, rouge sinon, avec la liste de ce qui manque

### Page publique adhérent

- Ouverte par le lien ou le QR code reçu par email, sans compte
- Affiche le statut de la licence et le QR code à présenter aux entraînements
- Le QR code se télécharge en PNG

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Vite, React Router 6 |
| Base de données | Supabase (PostgreSQL, Auth, Realtime) |
| Fonctions serveur | Vercel Serverless Functions (`/api/`) |
| Email | Nodemailer, SMTP Gmail |
| QR code | `qrcode.react` (génération), `html5-qrcode` (scan) |
| Import et export | PapaParse (CSV), SheetJS (xlsx), jsPDF et jspdf-autotable |
| Tests | Vitest (unitaires), Playwright (bout en bout) |
| Déploiement | Vercel |

## Structure du projet

```
├── api/                               # Fonctions serverless Vercel
│   ├── send-qr.js                     # Envoi des emails avec QR code (individuel, groupé, relance)
│   ├── public-adherent.js             # Lecture publique d'un adhérent par token
│   └── change-password.js             # Changement du mot de passe respos-sports par le bureau
│
├── migrations/                        # Scripts SQL à exécuter une fois sur une base existante
│
├── e2e/                               # Tests de bout en bout (Playwright)
│   ├── bureau.spec.js                 # Tableau de bord : tri, filtres, états vides, 1 284 lignes
│   ├── fenetres.spec.js               # Éditeur de fiche et envoi groupé (Échap, focus, mobile)
│   ├── merch.spec.js                  # Merch : fiche, récap, bon de commande, import
│   ├── scan.spec.js                   # Résultat du scan terrain
│   ├── adherent.spec.js               # Page publique adhérent
│   ├── captures.spec.js               # Captures d'écran pour relecture (CAPTURES=1, non lancé par défaut)
│   ├── emails-tuto.spec.js            # Images d'emails du tutoriel (TUTO=1, non lancé par défaut)
│   └── outils.js                      # Fonctions communes (ouverture, détection des débordements)
│
├── src/
│   ├── pages/
│   │   ├── Login.jsx                  # Connexion (bureau ou respos-sports)
│   │   ├── BureauDashboard.jsx        # Tableau de bord
│   │   ├── CoachScan.jsx              # Scan terrain
│   │   └── AdherentPublic.jsx         # Page publique de l'adhérent
│   │
│   ├── components/
│   │   ├── AdherentEditor.jsx         # Fiche adhérent (onglets Licence, Informations, Merch)
│   │   ├── BulkAdherentEditor.jsx     # Modification en masse
│   │   ├── RecapMerchModal.jsx        # Récap de commande merch, bon de commande PDF et fichier Excel
│   │   ├── ImportMerchModal.jsx       # Import des commandes de merch
│   │   ├── QrCodeModal.jsx            # Affichage et envoi d'un QR code
│   │   ├── EnvoiQrModal.jsx           # Sélection des adhérents pour l'envoi groupé
│   │   ├── ImportFormsModal.jsx       # Import Google Forms (CSV ou Excel)
│   │   ├── ImportComplementaireModal.jsx  # Import complémentaire (CSV ou Excel)
│   │   ├── TutorialModal.jsx          # Tutoriel (bureau et respos-sports)
│   │   ├── SettingsModal.jsx          # Paramètres
│   │   ├── Modal.jsx                  # Fenêtre modale commune basée sur <dialog>
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── licence.js                 # Statut de licence et messages
│   │   ├── emails.js                  # Contenu des emails, utilisé par api/send-qr.js
│   │   ├── merch.js                   # Articles, remise, récap de commande
│   │   ├── importMerch.js             # Lecture des commandes (formules, tailles, colonnes)
│   │   ├── fichierTableur.js          # Lecture d'un CSV ou d'un fichier Excel
│   │   ├── texte.js                   # Noms, réparation de l'encodage, tri
│   │   ├── useTitrePage.js            # Titre de l'onglet du navigateur
│   │   ├── supabase.js                # Client Supabase
│   │   ├── publicAccess.js            # URL publique d'un adhérent
│   │   └── *.test.js                  # Tests unitaires (Vitest)
│   │
│   ├── dev/                           # Développement uniquement, absent du build de production
│   │   ├── donneesTest.js             # Jeux de test : démo, pire cas, vide, un seul, 1 284 lignes
│   │   └── SelecteurDonnees.jsx       # Choix du jeu de test sur les routes /dev/*
│   │
│   └── context/
│       └── AuthContext.jsx            # Session et rôle (bureau ou coach)
│
├── public/fonts/                      # DejaVu Sans pour le bon de commande PDF (accents comme « Ś »)
├── schema.sql                         # Schéma complet de la base (tables, RLS, fonctions)
├── playwright.config.js
├── vercel.json                        # Redirige toutes les routes vers index.html
└── package.json
```

## Base de données

Table `adherents` :

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `public_token` | uuid | Token de la page publique et du QR code |
| `nom` | text | |
| `prenom` | text | |
| `email` | text | |
| `telephone` | text | |
| `sexe` | text | `H` ou `F` |
| `annee_etude` | text | ex. `3A étudiant` |
| `date_naissance` | text | ex. `16/07/2005` |
| `pays_naissance` | text | |
| `dept_naissance` | text | |
| `ville_naissance` | text | |
| `adresse` | text | |
| `code_postal` | text | |
| `ville` | text | |
| `types_licence` | text[] | `Sportive`, `Arbitre` ou `Encadrant` |
| `est_responsable_as` | boolean | Responsable AS, lié à la licence Encadrant |
| `adherent_bde` | boolean | |
| `licence_ffsu_a_jour` | boolean | Licence fédérale, n'entre pas dans le statut |
| `questionnaire_sante_ok` | boolean | Questionnaire santé rempli |
| `activite_contraintes` | boolean | Activité à contraintes particulières |
| `situation_handicap` | boolean | |
| `droit_image` | boolean | Droit à l'image accordé |
| `paiement_global` | boolean | Paiement complet reçu |
| `manque_paiement` | boolean | Paiement manquant |
| `manque_yeps` | boolean | Aide YEPS manquante |
| `manque_passport` | boolean | Aide PASS'SPORT manquante |
| `maillot` / `short` | boolean | Article de merch commandé |
| `flocage` | boolean | Option du maillot, impossible sans maillot |
| `taille_maillot` / `taille_short` | text | `XS` à `3XL`, ou la taille importée telle quelle |
| `texte_flocage` | text | Nom floqué au dos, 20 caractères maximum |
| `maillot_recupere` / `short_recupere` | boolean | Article remis à l'adhérent (le flocage est remis avec le maillot) |

La licence est à jour quand `questionnaire_sante_ok` et `paiement_global` sont vrais. La licence FFSU est seulement indicative : elle sert aux compétitions universitaires, pas aux entraînements.

Les noms et prénoms sont limités à 100 caractères et les emails à 254, en base comme dans le formulaire.

Pour une nouvelle base, exécuter `schema.sql` dans l'éditeur SQL de Supabase. Pour une base existante, exécuter dans l'ordre les scripts de `migrations/` pas encore appliqués :

| Script | Quand l'exécuter |
|---|---|
| `2026-10-25-1-fonction-scan.sql` | Avant de déployer le nouveau scan (ajoute la fonction `scanner_adherent`) |
| `2026-10-25-2-restreindre-lecture-coach.sql` | Après ce déploiement (retire au compte respos-sports l'accès direct à la table) |
| `2026-10-25-3-limites-longueur.sql` | N'importe quand (longueur des noms et des emails) |
| `2026-10-26-4-merch.sql` | Avant de déployer le merch (ajoute ses colonnes) |

## Variables d'environnement

Créer un fichier `.env.local` à la racine, à ne jamais committer :

```env
# Supabase, côté client (visible dans le bundle JS)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase, côté serveur (fonctions Vercel uniquement)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gmail SMTP pour l'envoi des emails
GMAIL_USER=votre.adresse@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# URL publique du site, utilisée dans les liens des emails (obligatoire pour l'envoi des QR codes)
APP_BASE_URL=https://as-licences-insa-cvl.vercel.app
```

`GMAIL_APP_PASSWORD` est un mot de passe d'application, créé dans les paramètres de sécurité du compte Google (la validation en deux étapes doit être activée). Sur Vercel, ces variables se renseignent dans Settings > Environment Variables.

## Installation

```bash
git clone https://github.com/victorlmnc/projetAPP-AS-qr-licence-manager.git
cd projetAPP-AS-qr-licence-manager
npm install

npm run dev        # serveur de développement sur http://localhost:5173
npm test           # tests unitaires
npm run test:e2e   # tests de bout en bout (démarre le serveur de dev)
npm run build      # build de production
```

En local, les fonctions `/api/` de Vercel ne tournent pas, donc l'envoi d'emails et le changement du mot de passe respos-sports ne marchent pas. La page publique adhérent lit alors Supabase directement, ce qui ne fonctionne que si le compte bureau est connecté dans le même navigateur. La caméra du scan fonctionne en HTTPS sur Vercel et sur `localhost`.

### Données de test

En développement, trois routes affichent les pages sans connexion ni Supabase. Un sélecteur en bas de l'écran change le jeu de données (Démo, Pire cas, Vide, Un seul, 1 284 lignes).

| Route | Page |
|---|---|
| `http://localhost:5173/dev/bureau` | Tableau de bord |
| `http://localhost:5173/dev/scan` | Résultat du scan terrain, sans caméra |
| `http://localhost:5173/dev/adherent` | Page publique adhérent |

Le jeu « Pire cas » regroupe des valeurs réalistes qui posent souvent problème à l'affichage : noms très longs, emails sans espace, homonymes, accents, écritures arabe et chinoise, texte mal encodé, saisie `<script>`. Les tests de bout en bout utilisent ces mêmes routes. Elles sont retirées du build de production (`import.meta.env.DEV`).

Les tests Playwright utilisent Chromium. S'il n'est pas installé, lancer une fois `npx playwright install chromium`.

## Déploiement

Vercel redéploie le site à chaque push sur `main`. Pour une nouvelle installation :

1. Importer le dépôt GitHub dans Vercel
2. Vérifier que la commande de build est `npm run build` et le dossier de sortie `dist`
3. Ajouter les variables d'environnement ci-dessus
4. Déployer

## Comptes

Les deux comptes sont gérés par Supabase Auth :

| Rôle | Accès |
|---|---|
| `bureau` | Tableau de bord, imports, exports, envoi d'emails, paramètres |
| `respos-sports` | Scan des QR codes uniquement |

Les mots de passe se changent depuis le menu Paramètres. Les adhérents n'ont pas de compte : ils accèdent à leur QR code par un lien public personnel.

## Sécurité

- Les liens adhérents utilisent `public_token`, un UUID aléatoire, et jamais l'`id` interne.
- `SUPABASE_SERVICE_ROLE_KEY` et `GMAIL_APP_PASSWORD` restent côté serveur.
- `/api/send-qr` vérifie la session Supabase et le rôle `bureau` avant chaque envoi.
- Avec les politiques RLS, seul le rôle `bureau` lit la table `adherents`.
- Le compte respos-sports n'a pas accès à la table. Le scan passe par la fonction SQL `scanner_adherent(token)`, qui renvoie un seul adhérent avec les seuls champs du statut : ni adresse, ni date de naissance, ni données médicales.

## Auteurs

Projet réalisé pour le cours *Développement et Mathématiques pour l'ingénieur, Projet d'application*, INSA CVL, 3e année STI.

- Mathis Hiron (mathis.hiron@insa-cvl.fr)
- Victor Lemanceau (victor.lemanceau@insa-cvl.fr)
- Gabin Pasquier-Ménard (gabin.pasquier--menard@insa-cvl.fr)
- Paul Bardoux (paul.bardoux@insa-cvl.fr)
- Enrique Zamarreno (enrique.zamarreno@insa-cvl.fr)
