# Controle des licences AS par QR Code

Web app / PWA pour suivre les licences d'une association sportive.

Objectif : le Bureau gere les fiches, les coachs scannent les QR codes sur le terrain, et les adherents consultent uniquement leur page publique via un lien/QR.

## Roles

Il y a seulement deux comptes connectes :

- `bureau` : saisie, modification, import CSV, QR codes, envoi mail, suppression.
- `coach` : scan terrain et lecture des informations de licence.

Les adherents n'ont pas de compte. Ils recoivent un lien public de type :

```text
/adherent/<public_token>
```

Ce token public est separe de l'ID interne de la fiche.

## Stack

- React + Vite
- Supabase Auth pour les deux comptes partages `bureau` et `coach`
- Supabase Postgres pour les fiches adherents
- Vercel pour le deploiement HTTPS
- Vercel Functions pour :
  - `/api/public-adherent`
  - `/api/send-qr`

## Installation locale

```bash
git clone <URL_DU_DEPOT>
cd projetAPP-AS-qr-licence-manager
npm install
cp .env.example .env
npm run dev
```

L'application tourne sur :

```text
http://localhost:5173
```

## Variables d'environnement

Dans `.env` en local et dans Vercel :

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

Important :

- `VITE_SUPABASE_ANON_KEY` est publique cote navigateur.
- `SUPABASE_SERVICE_ROLE_KEY` est privee et doit rester uniquement dans Vercel/env serveur.
- Ne jamais mettre de vraie cle dans le code, README ou `.env.example`.

## Base de donnees

Executer `schema.sql` dans l'editeur SQL Supabase.

Points importants du schema :

- `adherents.id` : ID interne.
- `adherents.public_token` : token public du QR/lien adherent.
- La table `profiles` accepte seulement `bureau` et `coach`.
- Les anonymes ne lisent pas directement la table `adherents`.
- La page publique passe par `/api/public-adherent`, qui renvoie une seule fiche par `public_token`.

## Creation des comptes

Les comptes sont crees a l'avance dans Supabase Auth :

1. Creer un utilisateur `bureau@as-licences.fr`.
2. Creer un utilisateur `coach@as-licences.fr`.
3. Ajouter leurs profils dans `profiles`.

Exemple SQL :

```sql
insert into profiles (id, role, nom, prenom)
values ('UID_DU_COMPTE_BUREAU', 'bureau', 'Bureau', 'AS');

insert into profiles (id, role, nom, prenom)
values ('UID_DU_COMPTE_COACH', 'coach', 'Coach', 'AS');
```

Le Bureau et les coachs peuvent ensuite changer leur mot de passe depuis l'app.

## Fonctionnalites

Espace Bureau :

- liste des adherents
- filtres multiples
- recherche nom/prenom/email
- creation et modification de fiche
- suppression avec confirmation
- historique recent avec annulation pendant la session
- import CSV
- export CSV
- QR public par adherent
- envoi de tous les QR par mail
- relance mail ciblee des licences non a jour
- reinitialisation globale avec mot de passe + confirmation `SUPPRIMER`

Espace Coach :

- scan QR avec camera
- lecture du token public
- affichage vert/rouge
- details des pieces manquantes

Page publique adherent :

- nom tres visible pour verification rapide par le coach
- statut de licence
- QR telechargeable
- aucune connexion requise

## Deploiement Vercel

Vercel detecte Vite automatiquement :

- Build command : `npm run build`
- Output directory : `dist`

Ajouter les variables d'environnement dans Vercel.

La camera fonctionne sur telephone seulement en HTTPS ou localhost.

## Miroir vers le repo Vercel

Le workflow `.github/workflows/mirror-to-vercel-repo.yml` copie `main` du repo de groupe vers :

```text
Mathishrn/as-licences-cvl
```

Il cree un commit miroir avec l'identite du compte lie au secret `MIRROR_TOKEN`, pour que Vercel accepte le deploiement meme si le commit source vient d'une autre personne.

Secret GitHub requis dans le repo de groupe :

```text
MIRROR_TOKEN
```

Permissions du token :

- `Contents: Read and write`
- `Workflows: Read and write`

## Commandes utiles

```bash
npm run dev
npm run build
npm run preview
```

## Points de securite

- Ne jamais rendre public un repo contenant de vraies donnees adherents.
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`.
- `/api/send-qr` verifie que l'utilisateur connecte est bien `bureau`.
- Les adherents n'ont pas de compte et ne peuvent pas modifier leur statut.
- Le token public du QR n'est pas l'ID interne de la fiche.
