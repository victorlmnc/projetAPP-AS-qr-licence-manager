# Contrôle des licences par QR Code

Web App / PWA pour le contrôle des licences d'une association sportive.
Trois rôles : **Bureau** (saisie), **Coach** (scan terrain), **Adhérent** (consultation).

Stack : React + Vite, Supabase (base de données Postgres + authentification + sécurité par rôle).

---

## 1. Installation (à faire par chacun, une fois)

Prérequis : Node.js 18+ installé.

```bash
git clone <URL_DU_DEPOT>
cd licences-qr
npm install
cp .env.example .env      # puis remplir les 2 clés Supabase
npm run dev
```

L'application tourne ensuite sur http://localhost:5173

### Clés Supabase
Dans Supabase : **Project Settings > API**. Copier :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY`

Le fichier `.env` n'est **jamais** poussé sur GitHub (il est dans `.gitignore`).
On se partage les clés à part (Discord/WhatsApp).

---

## 2. Base de données (à faire une fois par la Personne 1)

1. Créer un projet sur https://supabase.com
2. Ouvrir **SQL Editor** et exécuter le contenu de `schema.sql`
   (fourni à part) : il crée les tables `adherents` et `profiles`
   ainsi que les règles de sécurité par rôle.

### Créer un compte de test
1. **Authentication > Users > Add user** : créer un email + mot de passe.
2. Copier l'`UUID` du user créé.
3. Dans **SQL Editor**, lui attribuer un rôle :

```sql
-- Compte Bureau
insert into profiles (id, role, nom, prenom)
values ('UUID_DU_USER', 'bureau', 'Dupont', 'Marie');

-- Compte Coach
insert into profiles (id, role) values ('UUID_DU_USER', 'coach');

-- Compte Adhérent (lié à une fiche adherents)
insert into profiles (id, role, adherent_id)
values ('UUID_DU_USER', 'adherent', 'UUID_D_UNE_FICHE_ADHERENT');
```

---

## 3. Workflow GitHub

La branche `main` reste toujours stable. On ne pousse jamais directement dessus.

```bash
git checkout main
git pull                              # récupérer les dernières modifs
git checkout -b feature/ma-partie     # créer sa branche
# ... travailler, puis :
git add .
git commit -m "Description claire"
git push -u origin feature/ma-partie
```

Ensuite, ouvrir une **Pull Request** sur GitHub pour fusionner dans `main`
(idéalement relue par une autre personne du groupe).

Noms de branches suggérés :
`feature/socle` · `feature/bureau-dashboard` · `feature/bureau-qr` ·
`feature/coach-scan` · `feature/adherent-pwa`

---

## 4. Répartition des tâches (5 personnes)

| # | Partie | Fichiers principaux | Statut |
|---|--------|---------------------|--------|
| 1 | Socle, auth, routing | `App.jsx`, `context/AuthContext.jsx`, `pages/Login.jsx` | ✅ posé |
| 2 | Bureau – dashboard & filtres | `pages/BureauDashboard.jsx` | à faire |
| 3 | Bureau – formulaire & QR | `pages/BureauDashboard.jsx` | à faire |
| 4 | Coach – scanner caméra | `pages/CoachScan.jsx` | à faire |
| 5 | Adhérent & PWA | `pages/AdherentProfile.jsx`, `public/manifest.json` | à faire |

> Le calcul du statut est **commun** : il vit dans `src/lib/licence.js`.
> Tout le monde l'importe, personne ne le réécrit.

---

## 5. Structure du projet

```
src/
├── lib/
│   ├── supabase.js      Connexion à la base (client unique)
│   └── licence.js       ⭐ Calcul du statut — logique partagée
├── context/
│   └── AuthContext.jsx  Session + rôle de l'utilisateur connecté
├── components/
│   ├── ProtectedRoute.jsx  Protection des pages selon le rôle
│   ├── Header.jsx          Barre du haut commune
│   └── StatusBanner.jsx    Bandeau vert/rouge (Coach + Adhérent)
├── pages/
│   ├── Login.jsx            Connexion
│   ├── BureauDashboard.jsx  Espace Bureau
│   ├── CoachScan.jsx        Scan terrain
│   └── AdherentProfile.jsx  Vue adhérent
├── App.jsx              Routing + redirection par rôle
└── main.jsx             Point d'entrée
```

---

## 6. Notes utiles

- **QR Code** : il encode uniquement l'identifiant (`adherent.id`, un UUID).
  Le coach étant déjà connecté, l'app va chercher la fiche en base — ce qui
  évite d'exposer des données dans le QR lui-même.
- **Sécurité** : ce sont les règles RLS de Supabase (dans `schema.sql`) qui
  empêchent réellement un adhérent de voir/modifier les autres fiches.
  Ne jamais se reposer uniquement sur l'interface.
- **Génération de QR** : `import { QRCodeCanvas } from 'qrcode.react'`
- **Scan de QR** : librairie `html5-qrcode` déjà installée.
