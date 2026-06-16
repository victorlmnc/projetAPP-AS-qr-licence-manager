-- ============================================
-- Schéma : Système de Contrôle des Licences QR
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

create extension if not exists "pgcrypto";

-- ============================================
-- Table principale : dossier de licence de chaque adhérent
-- ============================================
create table adherents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  email text,

  -- Statuts principaux (cochés par le Bureau)
  fiche_renseignement boolean not null default false,
  paiement_global boolean not null default false,

  -- Détails de ce qui manque si paiement_global = false
  manque_paiement boolean not null default false,
  manque_yeps boolean not null default false,
  manque_passport boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Table des profils : relie un compte connecté à un rôle
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('bureau', 'coach', 'adherent')),
  adherent_id uuid references adherents(id) on delete set null,
  nom text,
  prenom text,
  created_at timestamptz not null default now()
);

-- Index sur la clé étrangère (performance)
create index if not exists profiles_adherent_id_idx on profiles(adherent_id);

-- ============================================
-- Fonction utilitaire : rôle de l'utilisateur connecté
-- - SECURITY DEFINER : peut lire profiles sans être bloquée par RLS
-- - SET search_path = public : empêche le hijacking du search_path
-- - (SELECT auth.uid()) : évalué une seule fois par requête (performance RLS)
-- ============================================
create or replace function get_my_role()
  returns text language sql security definer stable
  set search_path = public
as $$
  select role from profiles where id = (select auth.uid());
$$;

-- Restreindre l'exécution directe : les anonymes ne peuvent pas appeler
-- get_my_role() via l'API REST. Les policies RLS l'appellent en interne.
revoke execute on function get_my_role() from public;
grant execute on function get_my_role() to authenticated;
grant execute on function get_my_role() to service_role;

-- ============================================
-- Row Level Security : sécurité par rôle
-- ============================================
alter table adherents enable row level security;
alter table profiles enable row level security;

-- Adherents : une seule politique SELECT (bureau + coach + adhérent + public anon)
-- Les anonymes peuvent lire par UUID (page QR publique — UUID non devinable).
create policy "read_adherents"
  on adherents for select
  using (
    (select auth.role()) = 'anon'
    or get_my_role() in ('bureau', 'coach')
    or (
      get_my_role() = 'adherent'
      and id = (select adherent_id from profiles where id = (select auth.uid()))
    )
  );

-- Bureau : écriture complète sur les adhérents (insert / update / delete)
create policy "bureau_insert_adherents"
  on adherents for insert
  with check (get_my_role() = 'bureau');

create policy "bureau_update_adherents"
  on adherents for update
  using (get_my_role() = 'bureau');

create policy "bureau_delete_adherents"
  on adherents for delete
  using (get_my_role() = 'bureau');

-- Profiles : lecture consolidée (son propre profil OU bureau voit tout)
create policy "read_profiles"
  on profiles for select
  using (id = (select auth.uid()) or get_my_role() = 'bureau');

-- Profiles : le Bureau peut créer/modifier/supprimer uniquement les profils coach et adhérent
-- (pas les autres comptes bureau, pour éviter l'escalade de privilèges)
create policy "bureau_write_profiles"
  on profiles for insert
  to authenticated
  with check (get_my_role() = 'bureau' and role in ('coach', 'adherent'));

create policy "bureau_update_profiles"
  on profiles for update
  using (get_my_role() = 'bureau' and role != 'bureau')
  with check (role in ('coach', 'adherent'));

create policy "bureau_delete_profiles"
  on profiles for delete
  using (get_my_role() = 'bureau' and role != 'bureau');

-- ============================================
-- Trigger : mise à jour automatique de updated_at
-- ============================================
create or replace function set_updated_at()
  returns trigger language plpgsql
  set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_adherents_updated_at
  before update on adherents
  for each row
  execute function set_updated_at();

-- ============================================
-- Activation du Realtime pour la table adherents
-- ============================================
alter publication supabase_realtime add table adherents;
