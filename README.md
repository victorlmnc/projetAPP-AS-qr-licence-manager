# AS INSA CVL — Gestion des Licences

Application web de gestion des licences sportives pour l'**Association Sportive INSA CVL** (campus de Bourges).  
Déployée sur **[as-licences-insa-cvl.vercel.app](https://as-licences-insa-cvl.vercel.app)**.

---

## Fonctionnalités

### Espace Bureau
- Tableau de bord avec liste complète des adhérents, statistiques (à jour / non à jour), filtres et recherche par nom, prénom ou email
- Fiche adhérent détaillée : informations personnelles, adresse, type(s) de licence, rôle, médical, documents et paiement
- Import depuis l'export CSV de Google Forms (upsert automatique — double soumission gérée)
- Import complémentaire CSV/Excel pour mettre à jour des champs spécifiques (paiement, YEPS, PASS'SPORT…)
- Export de la liste filtrée en CSV, Excel (.xlsx) ou PDF
- Génération et envoi par email des QR Codes (individuel ou groupé)
- Relance automatique par email des dossiers incomplets
- Édition en masse de plusieurs adhérents simultanément
- Mise à jour temps réel via Supabase Realtime
- Paramètres : changement des mots de passe, remise à zéro de la base en fin de saison

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
| Tests | Vitest |
| Déploiement | Vercel |

---

## Architecture du projet

```
├── api/                               # Fonctions serverless Vercel
│   ├── send-qr.js                     # Envoi d'emails avec QR Code (individuel + groupé + relance)
│   ├── public-adherent.js             # Lecture publique d'un adhérent par token
│   ├── change-password.js             # Changement du mot de passe bureau
│   └── change-coach-password.js       # Changement du mot de passe respos-sports
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
│   │   ├── QrCodeModal.jsx            # Affichage et envoi d'un QR Code individuel
│   │   ├── EnvoiQrModal.jsx           # Modal de sélection pour envoi groupé
│   │   ├── ImportFormsModal.jsx       # Import depuis Google Forms CSV/Excel
│   │   ├── ImportComplementaireModal.jsx  # Import complémentaire CSV/Excel
│   │   ├── TutorialModal.jsx          # Tutoriel intégré (bureau + respos-sports)
│   │   ├── SettingsModal.jsx          # Paramètres
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── licence.js                 # Calcul du statut de licence et messages
│   │   ├── licence.test.js            # Tests unitaires (Vitest)
│   │   ├── supabase.js                # Client Supabase côté client
│   │   ├── texte.js                   # Utilitaires texte (nomComplet, reparerTexte)
│   │   └── publicAccess.js            # Construction de l'URL publique d'un adhérent
│   │
│   └── context/
│       └── AuthContext.jsx            # Authentification et rôle (bureau / coach)
│
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
| `manque_paiement` | boolean | Manque le paiement (chèque, CB, espèces…) |
| `manque_yeps` | boolean | Manque l'aide YEPS |
| `manque_passport` | boolean | Manque l'aide PASS'SPORT |

> **Statut de licence = `questionnaire_sante_ok AND paiement_global`**  
> La licence FFSU est informative uniquement (nécessaire pour les compétitions, pas pour les entraînements).

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

# Build de production
npm run build
```

> En développement local, les fonctions `/api/` Vercel ne s'exécutent pas.  
> La page publique adhérent bascule automatiquement sur un fallback Supabase direct.  
> La caméra (CoachScan) fonctionne en HTTPS sur Vercel et sur `localhost` en développement.

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
- Les politiques RLS Supabase protègent l'accès direct à la base

---

## Auteurs

Projet réalisé dans le cadre du cours *Développement et Mathématiques pour l'ingénieur* — INSA CVL, 3ème année STI.

- Mathis Hiron — mathis.hiron@insa-cvl.fr  
- Victor Lemanceau — victor.lemanceau@insa-cvl.fr  
- Gabin Pasquier-Ménard — gabin.pasquier--menard@insa-cvl.fr
- Paul Bardoux — paul.bardoux@insa-cvl.fr
- Enrique Zamarreno — enrique.zamarreno@insa-cvl.fr
