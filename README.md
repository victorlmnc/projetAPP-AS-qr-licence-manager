# AS INSA CVL — Gestion des Licences

Application web de gestion des licences sportives pour l'**Association Sportive INSA CVL** (campus de Bourges).  
Déployée sur **[as-licences-insa-cvl.vercel.app](https://as-licences-insa-cvl.vercel.app)**.

---

## Fonctionnalités

### Espace Bureau
- Tableau de bord avec liste complète des adhérents, statistiques (à jour / non à jour), filtres et recherche par nom, prénom ou email
- Fiche adhérent détaillée (un clic sur la ligne l'ouvre) : informations personnelles, adresse, type(s) de licence, rôle, médical, documents et paiement
- Import depuis l'export CSV de Google Forms (upsert automatique — double soumission gérée)
- Import complémentaire CSV/Excel pour mettre à jour des champs spécifiques (paiement, YEPS, PASS'SPORT…)
- Export de la liste filtrée en CSV, Excel (.xlsx) ou PDF
- Génération et envoi par email des QR Codes (individuel ou groupé)
- Relance automatique par email des dossiers incomplets
- Édition en masse de plusieurs adhérents simultanément (dont la remise du merch)
- Merch (maillot avec flocage en option, short) : articles commandés, tailles, texte floqué et remise article par article (le flocage est remis avec le maillot) ; filtre « Merch à remettre » ; récap de commande par taille, téléchargeable en bon de commande PDF ou en fichier Excel pour le fournisseur (sans aucun nom d'adhérent)
- Import des commandes de merch depuis l'export du site de paiement (ou un modèle Excel) : formules reconnues, aperçu avant d'appliquer, l'import n'ajoute que ce qui manque
- Mise à jour temps réel via Supabase Realtime
- Paramètres : changement des mots de passe, remise à zéro de la base en fin de saison
- Utilisable sur ordinateur et sur téléphone (sur petit écran, le tableau s'affiche en cartes)

### Espace Respos-Sports
- Scanner de QR Codes sur le terrain via la caméra du téléphone
- Résultat immédiat : écran vert (dossier à jour) ou rouge (dossier incomplet, avec le détail des éléments manquants)

### Page publique adhérent
- Accessible via le lien / QR Code envoyé par email, sans compte
- Affiche le statut de la licence et le QR Code à présenter lors des entraînements
- Téléchargement du QR Code en PNG

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite, React Router v6 |
| Base de données | Supabase (PostgreSQL + Auth + Realtime) |
| Fonctions serveur | Vercel Serverless Functions (`/api/`) |
| Email | Nodemailer via SMTP Gmail |
| QR Code | `qrcode.react` (génération), `html5-qrcode` (scan) |
| Import/Export | PapaParse (CSV), SheetJS xlsx, jsPDF + jspdf-autotable |
| Tests | Vitest (unitaires), Playwright (bout en bout) |
| Déploiement | Vercel |

---

## Architecture du projet

```
├── api/                               # Fonctions serverless Vercel
│   ├── send-qr.js                     # Envoi d'emails avec QR Code (individuel + groupé + relance)
│   ├── public-adherent.js             # Lecture publique d'un adhérent par token
│   └── change-password.js             # Changement du mot de passe respos-sports (par le bureau)
│
├── migrations/                        # Scripts SQL à exécuter une fois sur une base existante
│
├── e2e/                               # Tests de bout en bout (Playwright)
│   ├── bureau.spec.js                 # Tableau de bord : tri, filtres, états vides, 1 284 lignes
│   ├── fenetres.spec.js               # Éditeur de fiche et envoi groupé (Échap, focus, mobile)
│   ├── scan.spec.js                   # Résultat du scan terrain
│   ├── adherent.spec.js               # Page publique adhérent
│   ├── captures.spec.js               # Captures d'écran pour revue visuelle (CAPTURES=1, non lancé par défaut)
│   ├── emails-tuto.spec.js            # Régénère les images d'emails du tutoriel (TUTO=1, non lancé par défaut)
│   └── outils.js                      # Aides communes (ouverture, détection de débordements)
│
├── src/
│   ├── pages/
│   │   ├── Login.jsx                  # Page de connexion (bureau ou respos-sports)
│   │   ├── BureauDashboard.jsx        # Tableau de bord principal
│   │   ├── CoachScan.jsx              # Scanner QR terrain
│   │   └── AdherentPublic.jsx         # Page publique (QR Code adhérent)
│   │
│   ├── components/
│   │   ├── AdherentEditor.jsx         # Éditeur de fiche (2 onglets : Licence / Informations)
│   │   ├── BulkAdherentEditor.jsx     # Édition en masse
│   │   ├── RecapMerchModal.jsx        # Récap de commande merch, bon de commande PDF et fichier Excel
│   │   ├── ImportMerchModal.jsx       # Import des commandes de merch (aperçu puis application)
│   │   ├── QrCodeModal.jsx            # Affichage et envoi d'un QR Code individuel
│   │   ├── EnvoiQrModal.jsx           # Modal de sélection pour envoi groupé
│   │   ├── ImportFormsModal.jsx       # Import depuis Google Forms CSV/Excel
│   │   ├── ImportComplementaireModal.jsx  # Import complémentaire CSV/Excel
│   │   ├── TutorialModal.jsx          # Tutoriel intégré (bureau + respos-sports)
│   │   ├── SettingsModal.jsx          # Paramètres
│   │   ├── Modal.jsx                  # Fenêtre modale commune (<dialog> : Échap, focus, fond inerte)
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── licence.js                 # Calcul du statut de licence et messages
│   │   ├── licence.test.js            # Tests unitaires (Vitest)
│   │   ├── emails.js                  # Contenu des emails (QR Code, relance), utilisé par api/send-qr.js
│   │   ├── emails.test.js             # Tests unitaires (Vitest)
│   │   ├── useTitrePage.js            # Titre de l'onglet propre à chaque page
│   │   ├── supabase.js                # Client Supabase côté client
│   │   ├── texte.js                   # Utilitaires texte (nomComplet, reparerTexte, comparerParNom)
│   │   ├── texte.test.js              # Tests unitaires (Vitest)
│   │   ├── merch.js                   # Articles de merch, reste à remettre, récap de commande
│   │   ├── merch.test.js              # Tests unitaires (Vitest)
│   │   ├── importMerch.js             # Lecture des commandes : formules, tailles, colonnes, regroupement
│   │   ├── importMerch.test.js        # Tests unitaires (Vitest)
│   │   ├── fichierTableur.js          # Lecture CSV (séparateur et encodage détectés) ou Excel
│   │   └── publicAccess.js            # Construction de l'URL publique d'un adhérent
│   │
│   ├── dev/                           # Développement uniquement (absent du build de production)
│   │   ├── donneesTest.js             # Jeux de données de test : démo, pire cas, vide, un seul, 1 284 lignes
│   │   └── SelecteurDonnees.jsx       # Sélecteur de jeu de données affiché sur les routes /dev/*
│   │
│   └── context/
│       └── AuthContext.jsx            # Authentification et rôle (bureau / coach)
│
├── schema.sql                         # Schéma complet de la base (tables, RLS, fonctions)
├── playwright.config.js               # Configuration des tests de bout en bout
├── public/fonts/                      # DejaVu Sans (licence libre) pour le bon de commande PDF : lettres comme « Ś » floquées telles quelles
├── vercel.json                        # Réécriture SPA — toutes les routes → index.html
└── package.json
```

---

## Base de données

Table `adherents` dans Supabase :

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `public_token` | uuid | Token unique pour la page publique et le QR Code |
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
| `est_responsable_as` | boolean | Respo AS — synchronisé avec la licence Encadrant |
| `adherent_bde` | boolean | |
| `licence_ffsu_a_jour` | boolean | Licence fédérale (hors calcul du statut global) |
| `questionnaire_sante_ok` | boolean | Questionnaire santé rempli |
| `activite_contraintes` | boolean | Pratique d'une activité à contraintes particulières |
| `situation_handicap` | boolean | |
| `droit_image` | boolean | Autorisation droit à l'image accordée |
| `paiement_global` | boolean | Paiement complet reçu |
| `manque_paiement` | boolean | Manque le paiement |
| `manque_yeps` | boolean | Manque l'aide YEPS |
| `manque_passport` | boolean | Manque l'aide PASS'SPORT |
| `maillot` / `short` | boolean | Article de merch commandé |
| `flocage` | boolean | Option du maillot (impossible sans maillot) |
| `taille_maillot` / `taille_short` | text | `XS` à `3XL` (ou la taille importée telle quelle) |
| `texte_flocage` | text | Nom floqué au dos, 20 caractères maximum |
| `maillot_recupere` / `short_recupere` | boolean | Article remis à l'adhérent (le flocage est remis avec le maillot) |

> **Statut de licence = `questionnaire_sante_ok AND paiement_global`**  
> La licence FFSU est informative uniquement (nécessaire pour les compétitions, pas pour les entraînements).

> Longueurs maximales : 100 caractères pour `nom` et `prenom`, 254 pour `email` (contraintes SQL et champs du formulaire).

- **Nouvelle base** : exécuter `schema.sql` dans l'éditeur SQL Supabase.
- **Base existante** : exécuter dans l'ordre les scripts de `migrations/` qui n'ont pas encore été appliqués :

| Script | Quand l'exécuter |
|---|---|
| `2026-10-25-1-fonction-scan.sql` | Avant de déployer le nouveau scan (ajoute la fonction `scanner_adherent`, sans rien retirer) |
| `2026-10-25-2-restreindre-lecture-coach.sql` | **Après** le déploiement (retire au compte respos-sports l'accès direct à la table) |
| `2026-10-25-3-limites-longueur.sql` | N'importe quand (limites de longueur des noms et emails) |
| `2026-10-26-4-merch.sql` | **Avant** de déployer la fonctionnalité merch (ajoute les colonnes du merch) |

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine (ne jamais le committer) :

```env
# Supabase — côté client (exposé dans le bundle JS)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase — côté serveur (fonctions Vercel uniquement)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gmail SMTP — envoi des emails
GMAIL_USER=votre.adresse@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# URL publique du site, utilisée dans les liens des emails (obligatoire pour l'envoi des QR Codes)
APP_BASE_URL=https://as-licences-insa-cvl.vercel.app
```

> `GMAIL_APP_PASSWORD` doit être un **mot de passe d'application** généré dans les paramètres de sécurité du compte Google (authentification à deux facteurs requise).  
> Sur Vercel, renseigner ces variables dans **Settings → Environment Variables**.

---

## Installation & développement

```bash
# Cloner le dépôt
git clone https://github.com/victorlmnc/projetAPP-AS-qr-licence-manager.git
cd projetAPP-AS-qr-licence-manager

# Installer les dépendances
npm install

# Lancer en développement (http://localhost:5173)
npm run dev

# Lancer les tests unitaires
npm test

# Lancer les tests de bout en bout (démarre le serveur de dev tout seul)
npm run test:e2e

# Build de production
npm run build
```

> En développement local, les fonctions `/api/` Vercel ne s'exécutent pas (envoi d'emails, changement du mot de passe respos-sports).  
> La page publique adhérent bascule sur une lecture Supabase directe, qui ne fonctionne que connecté avec le compte bureau dans le même navigateur.  
> La caméra (CoachScan) fonctionne en HTTPS sur Vercel et sur `localhost` en développement.

### Tester avec des données de test

En développement uniquement, trois routes affichent les pages **sans connexion ni Supabase**, avec un sélecteur de jeu de données en bas de l'écran (Démo, Pire cas, Vide, Un seul, 1 284 lignes) :

| Route | Page |
|---|---|
| `http://localhost:5173/dev/bureau` | Tableau de bord |
| `http://localhost:5173/dev/scan` | Résultat du scan terrain (sans caméra) |
| `http://localhost:5173/dev/adherent` | Page publique adhérent |

Le jeu « Pire cas » contient des valeurs réalistes qui cassent souvent les interfaces : noms très longs, emails insécables, homonymes, caractères accentués, arabes ou chinois, texte encodé de travers, saisie `<script>`. Les tests de bout en bout s'appuient sur ces mêmes routes.

Ces routes et les données de test sont retirées du build de production (`import.meta.env.DEV`).

Les tests Playwright utilisent Chromium : si aucun n'est installé sur la machine, lancer une fois `npx playwright install chromium`.

---

## Déploiement

Le projet se déploie automatiquement sur **Vercel** à chaque push sur `main` :

1. Importer le repo GitHub dans Vercel
2. Vérifier que Vercel utilise `npm run build` et le dossier `dist`
3. Ajouter les variables d'environnement (voir ci-dessus)
4. Déployer

---

## Comptes

Deux comptes gérés via Supabase Auth :

| Rôle | Accès |
|---|---|
| `bureau` | Tableau de bord complet, imports, exports, envoi d'emails, paramètres |
| `respos-sports` | Scanner QR terrain uniquement |

Les mots de passe sont modifiables depuis l'application (menu Paramètres).  
Les adhérents n'ont pas de compte — ils accèdent à leur QR Code via un lien public unique.

---

## Sécurité

- Les liens adhérents utilisent `public_token` (UUID aléatoire), jamais l'`id` interne
- `SUPABASE_SERVICE_ROLE_KEY` et `GMAIL_APP_PASSWORD` ne sont jamais exposés côté client
- `/api/send-qr` vérifie la session Supabase et le rôle `bureau` avant tout envoi
- Les politiques RLS Supabase protègent l'accès direct à la base : seul le rôle `bureau` lit la table `adherents`
- Le compte respos-sports n'a aucun accès direct à la table : le scan passe par la fonction SQL `scanner_adherent(token)`, qui renvoie un seul adhérent et uniquement les champs du statut (pas d'adresse, de date de naissance ni de données médicales)

---

## Auteurs

Projet réalisé dans le cadre du cours *Développement et Mathématiques pour l'ingénieur - Projet d'application* — INSA CVL, 3ème année STI.

- Mathis Hiron — mathis.hiron@insa-cvl.fr  
- Victor Lemanceau — victor.lemanceau@insa-cvl.fr  
- Gabin Pasquier-Ménard — gabin.pasquier--menard@insa-cvl.fr
- Paul Bardoux — paul.bardoux@insa-cvl.fr
- Enrique Zamarreno — enrique.zamarreno@insa-cvl.fr
