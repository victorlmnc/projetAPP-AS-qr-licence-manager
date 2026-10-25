-- Schema : Systeme de Controle des Licences QR
-- A executer dans l'editeur SQL Supabase.
-- Le script est rejouable : il cree ce qui manque sans toucher aux donnees.

create extension if not exists "pgcrypto";

create table if not exists adherents (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,

  -- Identite et contact
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  sexe text,
  annee_etude text,
  date_naissance text,
  pays_naissance text,
  dept_naissance text,
  ville_naissance text,
  adresse text,
  code_postal text,
  ville text,

  -- Licence et role
  types_licence text[],
  est_responsable_as boolean not null default false,
  adherent_bde boolean not null default false,
  licence_ffsu_a_jour boolean not null default false,
  honorabilite_attestee boolean not null default false,

  -- Pratique sportive
  sports text[],
  competitions_universitaires boolean not null default false,
  licencie_annee_derniere boolean not null default false,

  -- Medical et autorisations
  questionnaire_sante_ok boolean not null default false,
  activite_contraintes boolean not null default false,
  situation_handicap boolean not null default false,
  droit_image boolean not null default false,
  fiche_renseignement boolean not null default false,

  -- Paiement
  paiement_global boolean not null default false,
  manque_paiement boolean not null default false,
  manque_yeps boolean not null default false,

  -- Merch : article commandé, taille, remis ou non. Le flocage est une
  -- option du maillot, remise avec lui.
  maillot boolean not null default false,
  taille_maillot text,
  maillot_recupere boolean not null default false,
  flocage boolean not null default false,
  texte_flocage text,
  short boolean not null default false,
  taille_short text,
  short_recupere boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration si la table existait deja avant l'ajout de ces colonnes.
alter table adherents add column if not exists telephone text;
alter table adherents add column if not exists sexe text;
alter table adherents add column if not exists annee_etude text;
alter table adherents add column if not exists date_naissance text;
alter table adherents add column if not exists pays_naissance text;
alter table adherents add column if not exists dept_naissance text;
alter table adherents add column if not exists ville_naissance text;
alter table adherents add column if not exists adresse text;
alter table adherents add column if not exists code_postal text;
alter table adherents add column if not exists ville text;
alter table adherents add column if not exists types_licence text[];
alter table adherents add column if not exists est_responsable_as boolean not null default false;
alter table adherents add column if not exists adherent_bde boolean not null default false;
alter table adherents add column if not exists licence_ffsu_a_jour boolean not null default false;
alter table adherents add column if not exists honorabilite_attestee boolean not null default false;
alter table adherents add column if not exists sports text[];
alter table adherents add column if not exists competitions_universitaires boolean not null default false;
alter table adherents add column if not exists licencie_annee_derniere boolean not null default false;
alter table adherents add column if not exists questionnaire_sante_ok boolean not null default false;
alter table adherents add column if not exists activite_contraintes boolean not null default false;
alter table adherents add column if not exists situation_handicap boolean not null default false;
alter table adherents add column if not exists droit_image boolean not null default false;
alter table adherents add column if not exists fiche_renseignement boolean not null default false;
alter table adherents add column if not exists maillot boolean not null default false;
alter table adherents add column if not exists taille_maillot text;
alter table adherents add column if not exists maillot_recupere boolean not null default false;
alter table adherents add column if not exists flocage boolean not null default false;
alter table adherents add column if not exists texte_flocage text;
alter table adherents add column if not exists short boolean not null default false;
alter table adherents add column if not exists taille_short text;
alter table adherents add column if not exists short_recupere boolean not null default false;
alter table adherents drop column if exists flocage_recupere;

-- Migration si la table existait deja avant l'ajout du token public.
alter table adherents add column if not exists public_token uuid;
update adherents set public_token = gen_random_uuid() where public_token is null;
alter table adherents alter column public_token set default gen_random_uuid();
alter table adherents alter column public_token set not null;
create unique index if not exists adherents_public_token_key on adherents(public_token);

-- Longueurs maximales (les memes que dans le formulaire de l'application).
alter table adherents drop constraint if exists adherents_nom_longueur;
alter table adherents add constraint adherents_nom_longueur
  check (char_length(nom) <= 100) not valid;
alter table adherents drop constraint if exists adherents_prenom_longueur;
alter table adherents add constraint adherents_prenom_longueur
  check (char_length(prenom) <= 100) not valid;
alter table adherents drop constraint if exists adherents_texte_flocage_longueur;
alter table adherents add constraint adherents_texte_flocage_longueur
  check (char_length(texte_flocage) <= 20) not valid;
alter table adherents drop constraint if exists adherents_flocage_sur_maillot;
alter table adherents add constraint adherents_flocage_sur_maillot
  check (not flocage or maillot) not valid;
alter table adherents drop constraint if exists adherents_email_longueur;
alter table adherents add constraint adherents_email_longueur
  check (char_length(email) <= 254) not valid;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('bureau', 'coach')),
  nom text,
  prenom text,
  created_at timestamptz not null default now()
);

alter table adherents enable row level security;
alter table profiles enable row level security;

-- Nettoyage des anciennes policies avant de supprimer les colonnes qu'elles peuvent utiliser.
drop policy if exists "bureau_full_access_adherents" on adherents;
drop policy if exists "coach_read_adherents" on adherents;
drop policy if exists "adherent_read_own" on adherents;
drop policy if exists "public_read_by_id" on adherents;
drop policy if exists "read_adherents" on adherents;
drop policy if exists "bureau_read_adherents" on adherents;
drop policy if exists "bureau_insert_adherents" on adherents;
drop policy if exists "bureau_update_adherents" on adherents;
drop policy if exists "bureau_delete_adherents" on adherents;

drop policy if exists "read_own_profile" on profiles;
drop policy if exists "bureau_read_profiles" on profiles;
drop policy if exists "bureau_write_profiles" on profiles;
drop policy if exists "bureau_insert_profiles" on profiles;
drop policy if exists "bureau_update_profiles" on profiles;
drop policy if exists "bureau_delete_profiles" on profiles;
drop policy if exists "bureau_manage_profiles" on profiles;
drop policy if exists "read_profiles" on profiles;

-- Migration depuis l'ancien modele avec comptes adherents.
drop index if exists profiles_adherent_id_idx;
alter table profiles drop constraint if exists profiles_role_check;
delete from profiles where role not in ('bureau', 'coach');
alter table profiles add constraint profiles_role_check check (role in ('bureau', 'coach'));
alter table profiles drop column if exists adherent_id;

create or replace function get_my_role()
  returns text language sql security definer stable
  set search_path = public
as $$
  select role from profiles where id = (select auth.uid());
$$;

-- Supabase accorde par defaut l'execution a anon : on la retire explicitement.
revoke execute on function get_my_role() from public, anon;
grant execute on function get_my_role() to authenticated;
grant execute on function get_my_role() to service_role;

-- Scan terrain : le coach n'a aucun acces direct a la table adherents.
-- Il lit un seul adherent a la fois, par token, avec les champs du statut uniquement.
create or replace function scanner_adherent(p_token uuid)
  returns table (
    public_token uuid,
    nom text,
    prenom text,
    questionnaire_sante_ok boolean,
    paiement_global boolean,
    manque_paiement boolean,
    manque_yeps boolean,
    licence_ffsu_a_jour boolean,
    activite_contraintes boolean
  )
  language sql security definer stable
  set search_path = public
as $$
  select
    a.public_token, a.nom, a.prenom,
    a.questionnaire_sante_ok, a.paiement_global,
    a.manque_paiement, a.manque_yeps,
    a.licence_ffsu_a_jour, a.activite_contraintes
  from adherents a
  where a.public_token = p_token
    and (select get_my_role()) in ('bureau', 'coach');
$$;

revoke execute on function scanner_adherent(uuid) from public, anon;
grant execute on function scanner_adherent(uuid) to authenticated;

-- Important : aucun acces anonyme direct a la table.
-- La page /adherent/:public_token passe par /api/public-adherent cote serveur.
-- (select get_my_role()) est evalue une seule fois par requete, pas par ligne.
create policy "bureau_read_adherents"
  on adherents for select
  to authenticated
  using ((select get_my_role()) = 'bureau');

create policy "bureau_insert_adherents"
  on adherents for insert
  to authenticated
  with check ((select get_my_role()) = 'bureau');

create policy "bureau_update_adherents"
  on adherents for update
  to authenticated
  using ((select get_my_role()) = 'bureau')
  with check ((select get_my_role()) = 'bureau');

create policy "bureau_delete_adherents"
  on adherents for delete
  to authenticated
  using ((select get_my_role()) = 'bureau');

create policy "read_profiles"
  on profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select get_my_role()) = 'bureau');

-- Le bureau peut gerer les profils non-bureau, sans creer d'escalade.
create policy "bureau_insert_profiles"
  on profiles for insert
  to authenticated
  with check ((select get_my_role()) = 'bureau' and role = 'coach');

create policy "bureau_update_profiles"
  on profiles for update
  to authenticated
  using ((select get_my_role()) = 'bureau' and role != 'bureau')
  with check (role = 'coach');

create policy "bureau_delete_profiles"
  on profiles for delete
  to authenticated
  using ((select get_my_role()) = 'bureau' and role != 'bureau');

create or replace function set_updated_at()
  returns trigger language plpgsql
  set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_adherents_updated_at on adherents;
create trigger trg_adherents_updated_at
  before update on adherents
  for each row
  execute function set_updated_at();

do $$
begin
  alter publication supabase_realtime add table adherents;
exception
  when duplicate_object then null;
end $$;
