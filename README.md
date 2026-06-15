# Contrôle des licences par QR Code

Web App / PWA pour le contrôle des licences d'une association sportive.
Trois rôles : **Bureau** (saisie), **Coach** (scan terrain), **Adhérent** (consultation).

Stack : React + Vite · Supabase (base Postgres + authentification + sécurité par rôle RLS).

---

## 1. Installation (chaque personne, une fois)

Prérequis : Node.js 18+.

```bash
git clone <URL_DU_DEPOT>
cd projetAPP-AS-qr-licence-manager
npm install
cp .env.example .env      # puis remplir les 2 clés Supabase (voir Discord) dans le .env copié
npm run dev # à partir d'ici on peut voir la page web sur http://localhost:5173
```

L'app tourne sur http://localhost:5173

Le `.env` n'est **jamais** poussé sur Git (il est dans `.gitignore`). On se partage les
clés en privé. Ne JAMAIS partager ni committer la clé **secret** (`sb_secret_...`).

---

## 2. Base de données

### Créer un compte avec un rôle
1. **Authentication > Users > Add user** : email + mot de passe, cocher **Auto Confirm User**.
2. Copier l'`UID` du compte créé.
3. Lui attribuer un rôle dans **SQL Editor** :

```sql
-- Bureau
insert into profiles (id, role, nom, prenom) values ('UID', 'bureau', 'Nom', 'Prénom');

-- Coach
insert into profiles (id, role) values ('UID', 'coach');

-- Adhérent : on relie le compte à une fiche existante (adherent_id)
insert into profiles (id, role, adherent_id) values ('UID', 'adherent', 'ID_D_UNE_FICHE');
```

> Pour un compte Adhérent, récupérer l'`id` d'une fiche dans **Table Editor > adherents**
> et le mettre dans `adherent_id`. C'est ce lien qui fait que l'adhérent voit SA fiche.

---

## 3. Workflow Git

`main` reste toujours stable. On ne pousse jamais directement dessus : chacun travaille
sur sa branche puis ouvre une Pull Request.

```bash
git checkout main
git pull                                 # récupérer les dernières modifs
git checkout -b feature/ma-partie        # créer sa branche
# ... travailler ...
git add .
git status                               # vérifier (le .env ne doit PAS apparaître)
git commit -m "Description claire"
git push -u origin feature/ma-partie     # le -u seulement la 1re fois
```

Puis, sur GitHub : ouvrir une **Pull Request** vers `main`, la faire relire, fusionner.

Noms de branches : `feature/socle` · `feature/bureau` · `feature/coach-scan` ·
`feature/adherent-pwa` · `feature/deploiement`

---

## 4. État d'avancement

| Partie | Responsable | État |
|--------|-------------|------|
| Socle (auth, rôles, routing) | Personne 1 | ✅ fait |
| Espace Bureau (liste, filtres, formulaire, QR) | Personnes 2 & 3 | ✅ fait |
| Scanner du Coach | Personne 4 | ✅ fait |
| Espace Adhérent + PWA | Personne 5 | ✅ fait côté application |
| Déploiement (HTTPS) | Personne 1 | ⬜ à faire |

---

## 5. Qui fait quoi — en détail

### Personne 1 — Socle, intégration, déploiement
**Fait :** connexion, gestion des rôles, routing protégé, base Supabase, schéma + RLS.
**À faire ensuite :**
- Gérer le dépôt : relire et fusionner les Pull Requests, garder `main` stable.
- Administrer Supabase : créer les comptes de test, lancer les modifs de schéma demandées.
- Déployer l'app (voir section 6) — **indispensable** car la caméra du Coach exige HTTPS.

### Personnes 2 & 3 — Espace Bureau
**Fait** dans `pages/BureauDashboard.jsx` + `components/AdherentEditor.jsx`,
`QrCodeModal.jsx`, `StatusBadge.jsx`. L'espace couvre : liste, recherche, 7 filtres,
statistiques à jour / non à jour, formulaire de création/mise à jour, suppression,
génération + téléchargement du QR Code, envoi `mailto:` et export CSV de la liste filtrée.

**À vérifier manuellement :**
- [ ] Tester tous les cas (paiement coché/décoché, filtres, suppression, export CSV, statut résultant).

### Personne 4 — Scanner du Coach
Fichier : `pages/CoachScan.jsx`.

**Fait :**
- Scanner caméra avec `html5-qrcode`.
- Lecture du QR Code, recherche Supabase par identifiant, arrêt automatique du scanner.
- Bandeau vert/rouge détaillé avec `StatusBanner`.
- Message si la caméra est refusée ou indisponible.
- Bouton « Scanner un autre ».
- Libération de la caméra au démontage du composant.

> Important : l'accès caméra ne marche qu'en **HTTPS** (ou sur `localhost` en dev).
> Pour tester sur un vrai téléphone, il faut que l'app soit déployée (section 6).

### Personne 5 — Espace Adhérent + PWA
Fichier : `pages/AdherentProfile.jsx`.

**Fait :**
- Chargement de la fiche personnelle reliée au profil Supabase.
- Affichage du message d'avancement avec `messageAdherent`.
- Affichage du bandeau vert/rouge et du QR Code personnel.
- PWA sans dépendance supplémentaire : `public/manifest.json`, `public/sw.js`,
  `public/icon-192.png`, `public/icon-512.png` et bouton d'installation dans le `Header`.

**À vérifier manuellement :**
- [ ] Tester l'installation PWA après build + déploiement HTTPS.
- [ ] Vérifier le rendu mobile sur les 3 espaces.

---

## 6. Déploiement (HTTPS obligatoire pour la caméra)

Le Coach scanne avec son téléphone : les navigateurs n'autorisent la caméra qu'en HTTPS.
Il faut donc déployer l'app. Le plus simple et gratuit : **Vercel** ou **Netlify**.

Avec Vercel :
1. Créer un compte, **New Project**, importer le dépôt GitHub.
2. Vercel détecte Vite automatiquement (build : `npm run build`, dossier : `dist`).
3. Dans les **Environment Variables**, ajouter `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que le `.env` local).
4. **Deploy**. L'app est en ligne en HTTPS → la caméra fonctionne sur téléphone.

À chaque push sur `main`, Vercel redéploie tout seul.

### Miroir automatique vers le dépôt connecté à Vercel

Le workflow `.github/workflows/mirror-to-vercel-repo.yml` se lance à chaque push
sur `main` du dépôt de groupe et crée un nouveau commit miroir vers
`Mathishrn/as-licences-cvl` sur sa branche `main`.

Ce commit miroir est créé avec l'identité GitHub du compte qui possède le token
`MIRROR_TOKEN`. Cela permet au dépôt connecté à Vercel de recevoir un commit
attribué à `Mathishrn`, même si le commit source du dépôt de groupe vient d'une
autre personne.

À faire une seule fois dans le dépôt de groupe GitHub :
1. Depuis le compte qui possède `Mathishrn/as-licences-cvl`, créer un token GitHub
   limité à ce dépôt, avec les droits `Contents: Read and write` et
   `Workflows: Read and write`.
2. Dans le dépôt de groupe : **Settings > Secrets and variables > Actions**.
3. Créer un secret nommé `MIRROR_TOKEN` avec la valeur du token.

Ne jamais mettre ce token dans `.env`, `.env.example` ou dans le code.

---

## 7. Structure du projet

```
src/
├── lib/
│   ├── supabase.js          Connexion à la base (client unique)
│   └── licence.js           ⭐ Calcul du statut — logique partagée
├── context/
│   └── AuthContext.jsx      Session + rôle de l'utilisateur connecté
├── components/
│   ├── ProtectedRoute.jsx   Protection des pages selon le rôle
│   ├── Header.jsx           Barre du haut commune
│   ├── StatusBanner.jsx     Grand bandeau vert/rouge (Coach + Adhérent)
│   ├── StatusBadge.jsx      Pastille de statut (tableau Bureau)
│   ├── AdherentEditor.jsx   Panneau de saisie/mise à jour (Bureau)
│   └── QrCodeModal.jsx      Affichage + téléchargement du QR Code (Bureau)
├── pages/
│   ├── Login.jsx            Connexion
│   ├── BureauDashboard.jsx  Espace Bureau (+ BureauDashboard.css)
│   ├── CoachScan.jsx        Scan terrain
│   └── AdherentProfile.jsx  Vue adhérent
├── App.jsx                  Routing + redirection par rôle
└── main.jsx                 Point d'entrée
```

---

## 8. Aide-mémoire technique

- **Statut d'une licence** : toujours via `calculerStatutLicence(adherent)` de
  `src/lib/licence.js`. Ne jamais recalculer le statut à la main ailleurs.
- **Lire en base** : `await supabase.from('adherents').select('*')`
- **Écrire en base** : `.insert(obj)` / `.update(obj).eq('id', id)` / `.delete().eq('id', id)`
- **Générer un QR** : `import { QRCodeCanvas } from 'qrcode.react'` puis `<QRCodeCanvas value={id} />`
- **Scanner un QR** : librairie `html5-qrcode` (le QR encode l'`id` de l'adhérent).
- **Sécurité** : ce sont les règles RLS de `schema.sql` qui empêchent réellement un
  adhérent de voir/modifier d'autres fiches. Ne jamais se reposer sur l'interface seule.
- **Caméra** : `getUserMedia` exige HTTPS → tester sur `localhost` en dev, déployer pour le terrain.
