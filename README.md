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
| Espace Bureau (liste, filtres, formulaire, QR) | Personnes 2 & 3 | ✅ base fournie, à finir |
| Scanner du Coach | Personne 4 | ⬜ à faire |
| Espace Adhérent + PWA | Personne 5 | ⬜ à faire |
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
**Base fournie** dans `pages/BureauDashboard.jsx` + `components/AdherentEditor.jsx`,
`QrCodeModal.jsx`, `StatusBadge.jsx`. Elle couvre : liste, recherche, 7 filtres,
formulaire de création/mise à jour, génération + téléchargement du QR Code.

**Ce qu'il reste à faire (à se répartir à 2) :**
- [ ] **Lire et comprendre le code fourni** : c'est votre référence pour lire/écrire en base.
- [ ] **Bandeau de statistiques** en haut : nombre d'adhérents à jour / non à jour.
- [ ] **Supprimer un adhérent** (bouton + confirmation) → `supabase.from('adherents').delete().eq('id', id)`.
- [ ] **« Envoi » du QR Code** : ajouter un lien `mailto:` pré-rempli vers `adherent.email`
      depuis la modale QR (le cahier demande « envoi OU génération »).
- [ ] **Export CSV** de la liste filtrée (pratique pour le Bureau).
- [ ] **Documenter** la procédure de création d'un compte Adhérent (section 2) pour l'équipe.
- [ ] **Tester** tous les cas (paiement coché/décoché, filtres, statut résultant).

### Personne 4 — Scanner du Coach
Fichier : `pages/CoachScan.jsx`. La recherche en base (`chercherAdherent`) et l'affichage
du bandeau vert/rouge (`StatusBanner`) sont **déjà câblés**. Il manque la caméra.

Étapes :
- [ ] Ajouter un conteneur caméra dans le JSX : `<div id="reader" />`.
- [ ] Initialiser le scanner avec `html5-qrcode` (déjà installé) dans un `useEffect`.
- [ ] À la lecture, appeler `chercherAdherent(texteLu)` puis arrêter le scanner.
- [ ] Gérer le refus d'accès caméra (afficher un message).
- [ ] Ajouter un bouton « Scanner un autre » qui réinitialise l'écran.
- [ ] **Bien libérer la caméra** au démontage du composant (sinon elle reste allumée).

Squelette de l'intégration caméra :

```jsx
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// ... dans le composant :
const scannerRef = useRef(null);

useEffect(() => {
  const scanner = new Html5Qrcode('reader');
  scannerRef.current = scanner;

  scanner.start(
    { facingMode: 'environment' },     // caméra arrière du téléphone
    { fps: 10, qrbox: 250 },
    (texteLu) => {                     // QR détecté
      scanner.stop();
      chercherAdherent(texteLu);       // (fonction déjà présente dans le fichier)
    },
    () => {}                           // erreurs de lecture ignorées
  ).catch(() => setErreur("Impossible d'accéder à la caméra."));

  return () => { scannerRef.current?.stop().catch(() => {}); }; // libère la caméra
}, []);
```

> Important : l'accès caméra ne marche qu'en **HTTPS** (ou sur `localhost` en dev).
> Pour tester sur un vrai téléphone, il faut que l'app soit déployée (section 6).

### Personne 5 — Espace Adhérent + PWA
Fichier : `pages/AdherentProfile.jsx`. Le chargement de la fiche et le message
d'avancement (`messageAdherent`) sont **déjà câblés**.

**Partie Adhérent :**
- [ ] Afficher le QR Code de l'adhérent (réutiliser le composant `QRCodeCanvas`,
      comme dans `QrCodeModal.jsx`, avec `value={adherent.id}`).
- [ ] Soigner l'affichage du statut (visuel clair : à jour / en attente).

**Partie PWA (installable + rapide) :**
- [ ] Installer le plugin : `npm install -D vite-plugin-pwa`.
- [ ] Le configurer dans `vite.config.js` :

```js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Contrôle des licences',
        short_name: 'Licences',
        theme_color: '#16181d',
        background_color: '#16181d',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

- [ ] Ajouter deux icônes dans `public/` : `icon-192.png` (192×192) et `icon-512.png` (512×512).
- [ ] Le plugin génère le manifest : supprimer alors `public/manifest.json` et la ligne
      `<link rel="manifest">` de `index.html` pour éviter le doublon.
- [ ] Vérifier que tout est **responsive** (affichage propre sur mobile) sur les 3 espaces.

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

À chaque fusion sur `main`, Vercel redéploie tout seul.

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
