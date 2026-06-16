# Controle des licences par QR Code

Application web / PWA pour gerer les licences d'une association sportive :
saisie bureau, scan coach, lien public adherent avec QR code et statut.

Stack : React + Vite, Supabase (Postgres, Auth, RLS), Vercel, Gmail SMTP.

## Installation

Prerequis : Node.js 18+.

```bash
npm install
cp .env.example .env
npm run dev
```

L'application locale tourne ensuite sur `http://localhost:5173`.

Le fichier `.env` ne doit jamais etre pousse sur Git.

## Variables d'environnement

Copier `.env.example` en `.env`, puis renseigner :

| Variable | Role |
| --- | --- |
| `VITE_SUPABASE_URL` | URL publique du projet Supabase cote client |
| `VITE_SUPABASE_ANON_KEY` | Cle anon Supabase cote client |
| `SUPABASE_URL` | URL Supabase cote fonctions Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service role, uniquement cote serveur |
| `APP_BASE_URL` | URL publique de l'application, ex. `https://as-licences.vercel.app` |
| `GMAIL_USER` | Adresse Gmail qui envoie les QR codes |
| `GMAIL_APP_PASSWORD` | Mot de passe d'application Gmail |

Sur Vercel, ajouter les memes variables dans `Settings > Environment Variables`.
Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` ou `GMAIL_APP_PASSWORD` dans le code front.

## Base de donnees

Executer `schema.sql` dans le SQL Editor Supabase.

Le schema utilise seulement deux types de comptes connectes :

- `bureau` : gestion complete des adherents, emails et parametrage.
- `coach` : scan terrain et consultation du resultat de controle.

Les adherents n'ont pas de compte. Ils recoivent un lien public de type
`/adherent/:public_token`. Ce token public est separe de l'`id` interne de la fiche.

### Creer les comptes

1. Dans Supabase, aller dans `Authentication > Users > Add user`.
2. Creer le compte `bureau`, puis copier son `UID`.
3. Creer le compte `coach`, puis copier son `UID`.
4. Associer les roles :

```sql
insert into profiles (id, role, nom, prenom)
values ('UID_BUREAU', 'bureau', 'Bureau', 'AS');

insert into profiles (id, role, nom, prenom)
values ('UID_COACH', 'coach', 'AS');
```

## Fonctionnalites

### Bureau

- Liste, recherche, filtres et statistiques des adherents.
- Creation, edition et suppression de fiches.
- Import CSV et export CSV.
- Generation du QR code public d'un adherent.
- Envoi individuel du QR par email.
- Envoi groupe a tous les adherents avec email.
- Relance ciblee des adherents non a jour, avec recherche et selection.
- Popups de confirmation propres pour suppression et reinitialisation.
- Mise a jour temps reel via Supabase Realtime.

### Coach

- Scan camera avec `html5-qrcode`.
- Lecture du token public du QR.
- Affichage rapide du statut de licence et des pieces manquantes.

### Page publique adherent

Route : `/adherent/:public_token`.

La page publique affiche uniquement :

- le nom de l'adherent, en grand pour faciliter le controle visuel ;
- le statut de la licence ;
- le QR code public.

Elle ne donne pas acces aux informations internes de gestion.

## API

### `GET /api/public-adherent?token=...`

Expose uniquement les champs publics necessaires a la page adherent et au scan.
La recherche se fait par `public_token`, jamais par l'`id` interne.

### `POST /api/send-qr`

Fonction Vercel protegee :

- session Supabase obligatoire ;
- role `bureau` obligatoire ;
- `mode: "all"` pour l'envoi groupe ;
- `mode: "reminder"` pour la relance ciblee des adherents non a jour ;
- `adherentIds: [...]` pour limiter les destinataires.

Exemple :

```json
{
  "mode": "reminder",
  "adherentIds": ["uuid-1", "uuid-2"]
}
```

## Deploiement Vercel

1. Importer le repo GitHub dans Vercel.
2. Verifier que Vercel utilise `npm run build` et le dossier `dist`.
3. Ajouter les variables d'environnement.
4. Deployer.

La camera fonctionne en HTTPS sur Vercel et sur `localhost` en developpement.

## Miroir GitHub

Le workflow `.github/workflows/mirror-to-vercel-repo.yml` peut pousser `main`
vers le repo connecte a Vercel. Il a besoin d'un secret GitHub `MIRROR_TOKEN`
ayant les droits `Contents` et `Workflows` sur le repo miroir.

## Tests

```bash
npm test -- --run
npm run build
```

## Points de securite

- Les permissions principales sont dans les politiques RLS de Supabase.
- Les liens adherents utilisent `public_token`, pas l'ID interne.
- Les secrets restent dans `.env` local ou dans Vercel, jamais dans Git.
- `/api/send-qr` refuse les appels sans session Supabase bureau.
- Les anciens acces publics directs par policy ont ete supprimes du schema.
