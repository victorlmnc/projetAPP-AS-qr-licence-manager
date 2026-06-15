# Contrôle des licences par QR Code

Web App / PWA pour le contrôle des licences d'une association sportive.  
Trois rôles : **Bureau** (saisie & envoi), **Coach** (scan terrain), **Adhérent** (consultation).

Stack : React + Vite · Supabase (Postgres + Auth + RLS) · Vercel (hébergement + fonction email serverless) · Gmail SMTP (envoi des QR codes).

---

## 1. Installation

Prérequis : Node.js 18+.

```bash
git clone <URL_DU_DEPOT>
cd projetAPP-AS-qr-licence-manager
npm install
cp .env.example .env   # remplir les variables (voir section 2)
npm run dev            # http://localhost:5173
```

Le `.env` n'est **jamais** poussé sur Git. Ne jamais committer une clé secrète.

---

## 2. Variables d'environnement

Copier `.env.example` en `.env` et renseigner :

| Variable | Où la trouver |
|----------|---------------|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API (secret) |
| `GMAIL_USER` | Adresse Gmail utilisée pour envoyer les emails |
| `GMAIL_APP_PASSWORD` | Gmail > Sécurité > Mots de passe d'application |

`SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER` et `GMAIL_APP_PASSWORD` sont utilisés uniquement par la fonction serverless Vercel (`api/send-qr.js`) — ils ne sont **jamais** exposés côté client.

Sur Vercel, ajouter toutes ces variables dans **Settings > Environment Variables**.

---

## 3. Base de données

Exécuter `schema.sql` dans l'éditeur SQL de Supabase pour créer les tables, les politiques RLS et le trigger `updated_at`.

### Créer un compte avec un rôle

1. **Authentication > Users > Add user** : email + mot de passe, cocher **Auto Confirm User**.
2. Copier l'`UID` du compte créé.
3. Lui attribuer un rôle via **SQL Editor** :

```sql
-- Bureau (admin)
insert into profiles (id, role, nom, prenom)
values ('UID', 'bureau', 'Nom', 'Prénom');

-- Coach (scan terrain uniquement)
insert into profiles (id, role)
values ('UID', 'coach');

-- Adhérent : relier le compte à une fiche existante
insert into profiles (id, role, adherent_id)
values ('UID', 'adherent', 'ID_DE_LA_FICHE');
```

> Pour un adhérent, récupérer l'`id` de sa fiche dans **Table Editor > adherents** et le mettre dans `adherent_id`.

---

## 4. Fonctionnalités

### Espace Bureau (`/bureau`)

- **Liste des adhérents** avec recherche par nom/prénom (combiné, insensible aux accents)
- **7 filtres** : Tous · À jour · Non à jour · Fiche manquante · Manque YEPS · Manque PASS'SPORT · Manque paiement
- **Statistiques** : total · à jour · non à jour
- **Création / édition / suppression** d'une fiche adhérent
- **Import CSV** : colonnes `nom`, `prenom`, `email`, `fiche`, `paiement` (+ colonnes optionnelles `manque_paiement`, `manque_yeps`, `manque_passport`)
- **Export CSV** de la liste actuellement affichée (filtrée + recherche)
- **QR Code** : affichage, téléchargement PNG, envoi par email individuel
- **Envoi groupé** : modal de confirmation avec liste des destinataires, cases à cocher, recherche — envoie à tous les adhérents ayant une adresse email
- Barre de progression pendant l'envoi groupé
- **Mise à jour temps réel** (Supabase Realtime)

### Scanner du Coach (`/scan`)

- Caméra temps réel (via `html5-qrcode`)
- Lecture du QR, recherche en base par UUID, bandeau vert/rouge avec détail des anomalies
- Bouton « Scanner un autre »
- Fonctionne uniquement en HTTPS (ou sur `localhost` en dev)

### Espace Adhérent (`/profil`)

- Fiche personnelle : statut, message, QR Code personnel
- PWA installable sur téléphone (manifest + service worker)

### Page publique (`/adherent/:id`)

- Accessible sans connexion, via le lien reçu par email
- Affiche le QR Code, le nom et le statut de l'adhérent
- L'UUID (128 bits) sert de token d'accès non devinable

---

## 5. Envoi des QR codes par email

La fonction serverless `api/send-qr.js` tourne sur Vercel :

- **POST `/api/send-qr`** avec `{ adherentIds: [...] }` → envoie aux IDs listés
- **POST `/api/send-qr`** sans body → envoie à tous les adhérents avec email
- Chaque email contient un bouton vers la page publique `/adherent/:id`
- Authentification Gmail via mot de passe d'application (pas le mot de passe principal)

Limite Gmail gratuit : 500 emails/jour. Au-delà, relancer le bouton le lendemain.

---

## 6. Déploiement (Vercel)

La caméra du Coach exige HTTPS → déployer sur Vercel pour les tests terrain.

1. **New Project** sur Vercel, importer le dépôt GitHub.
2. Vercel détecte Vite automatiquement (`npm run build` → `dist/`).
3. Ajouter les 5 variables d'environnement (section 2).
4. **Deploy** — l'app est en ligne, la caméra fonctionne sur téléphone.

À chaque push sur `main`, Vercel redéploie automatiquement.

### Miroir automatique

Le workflow `.github/workflows/mirror-to-vercel-repo.yml` pousse automatiquement chaque commit de `main` vers le dépôt Vercel (`Mathishrn/as-licences-cvl`).  
Il nécessite un secret GitHub `MIRROR_TOKEN` (token personnel limité à ce dépôt, droits `Contents` + `Workflows`).

---

## 7. Workflow Git

`main` reste toujours stable. On travaille sur des branches et on ouvre une Pull Request.

```bash
git checkout main
git pull
git checkout -b feature/ma-partie
# ... travailler ...
git add fichier1 fichier2
git commit -m "Description claire"
git push -u origin feature/ma-partie
```

Puis ouvrir une **Pull Request** vers `main` sur GitHub.

---

## 8. Structure du projet

```
src/
├── lib/
│   ├── supabase.js          Client Supabase unique
│   ├── licence.js           ⭐ Calcul du statut de licence (logique partagée)
│   └── texte.js             Réparation mojibake, nomComplet()
├── context/
│   └── AuthContext.jsx      Session + rôle de l'utilisateur connecté
├── components/
│   ├── ProtectedRoute.jsx   Protection des pages selon le rôle
│   ├── Header.jsx           Barre du haut + paramètres + déconnexion
│   ├── StatusBanner.jsx     Bandeau vert/rouge avec détail anomalies
│   ├── StatusBadge.jsx      Pastille de statut (tableau Bureau)
│   ├── AdherentEditor.jsx   Formulaire création/édition (Bureau)
│   ├── QrCodeModal.jsx      Affichage + téléchargement + envoi mail du QR
│   ├── EnvoiQrModal.jsx     Sélection des destinataires pour envoi groupé
│   ├── ImportCsvModal.jsx   Import CSV en masse
│   ├── SettingsModal.jsx    Paramètres (mot de passe, réinitialisation)
│   ├── ChangePasswordModal.jsx  Changement de mot de passe
│   ├── ResetAdherentsModal.jsx  Suppression de tous les adhérents (bureau)
│   └── InstallButton.jsx    Bouton d'installation PWA
├── pages/
│   ├── Login.jsx            Connexion
│   ├── BureauDashboard.jsx  Espace Bureau
│   ├── CoachScan.jsx        Scanner terrain
│   ├── AdherentProfile.jsx  Espace adhérent connecté
│   └── AdherentPublic.jsx   Page publique sans login (lien email)
├── App.jsx                  Routing + redirection par rôle
└── main.jsx                 Point d'entrée + PWA + Analytics
api/
└── send-qr.js               Fonction serverless Vercel — envoi email Gmail
public/
└── manifest.json / sw.js / icons  PWA
```

---

## 9. Aide-mémoire technique

- **Statut d'une licence** : toujours via `calculerStatutLicence(adherent)` (`src/lib/licence.js`). Ne jamais recalculer ailleurs.
- **Lire en base** : `await supabase.from('adherents').select('*')`
- **Écrire en base** : `.insert(obj)` / `.update(obj).eq('id', id)` / `.delete().eq('id', id)`
- **Générer un QR** : `<QRCodeCanvas value={id} />` (`qrcode.react`)
- **Scanner un QR** : `html5-qrcode` — le QR encode l'`id` UUID de l'adhérent
- **Sécurité** : les règles RLS de Supabase sont la vraie barrière. L'interface seule ne suffit pas.
- **Caméra** : `getUserMedia` exige HTTPS → tester sur `localhost`, déployer pour le terrain.
- **Texte mojibake** : passer par `reparerTexte()` (`src/lib/texte.js`) pour les données importées depuis Excel/CSV Windows.
