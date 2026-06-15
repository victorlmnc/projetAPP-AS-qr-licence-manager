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

-- ============================================
-- Fonction utilitaire : rôle de l'utilisateur connecté
-- (security definer => peut lire profiles sans être bloquée par RLS)
-- ============================================
create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================
-- Row Level Security : sécurité par rôle
-- ============================================
alter table adherents enable row level security;
alter table profiles enable row level security;

-- Bureau : accès total (lecture + écriture) sur les adhérents
create policy "bureau_full_access_adherents"
  on adherents for all
  using (get_my_role() = 'bureau');

-- Coach : lecture seule sur tous les adhérents (pour le scan terrain)
create policy "coach_read_adherents"
  on adherents for select
  using (get_my_role() = 'coach');

-- Adhérent : lecture de sa propre fiche uniquement
create policy "adherent_read_own"
  on adherents for select
  using (
    get_my_role() = 'adherent'
    and id = (select adherent_id from profiles where id = auth.uid())
  );

-- Profiles : chacun peut lire son propre profil (son rôle)
create policy "read_own_profile"
  on profiles for select
  using (id = auth.uid());

-- Profiles : le Bureau gère la création des comptes Coach/Adhérent
create policy "bureau_manage_profiles"
  on profiles for all
  using (get_my_role() = 'bureau');

-- Lecture publique d'une fiche adhérent par son UUID (utilisé par la page /adherent/:id).
-- L'UUID sert de token d'accès : 128 bits aléatoires, non devinable.
create policy "public_read_by_id"
  on adherents for select
  to anon
  using (true);

-- ============================================
-- Trigger : mise à jour automatique de updated_at
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_adherents_updated_at
  before update on adherents
  for each row
  execute function set_updated_at();
