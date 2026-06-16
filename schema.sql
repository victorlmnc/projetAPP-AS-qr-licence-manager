-- Schema : Systeme de Controle des Licences QR
-- A executer dans l'editeur SQL Supabase.

create extension if not exists "pgcrypto";

create table if not exists adherents (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  nom text not null,
  prenom text not null,
  email text,

  fiche_renseignement boolean not null default false,
  paiement_global boolean not null default false,

  manque_paiement boolean not null default false,
  manque_yeps boolean not null default false,
  manque_passport boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration si la table existait deja avant l'ajout du token public.
alter table adherents add column if not exists public_token uuid;
update adherents set public_token = gen_random_uuid() where public_token is null;
alter table adherents alter column public_token set default gen_random_uuid();
alter table adherents alter column public_token set not null;
create unique index if not exists adherents_public_token_key on adherents(public_token);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('bureau', 'coach')),
  nom text,
  prenom text,
  created_at timestamptz not null default now()
);

alter table profiles drop constraint if exists profiles_role_check;
delete from profiles where role not in ('bureau', 'coach');
alter table profiles add constraint profiles_role_check check (role in ('bureau', 'coach'));
alter table profiles drop column if exists adherent_id;

create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

alter table adherents enable row level security;
alter table profiles enable row level security;

drop policy if exists "bureau_full_access_adherents" on adherents;
create policy "bureau_full_access_adherents"
  on adherents for all
  using (get_my_role() = 'bureau')
  with check (get_my_role() = 'bureau');

drop policy if exists "coach_read_adherents" on adherents;
create policy "coach_read_adherents"
  on adherents for select
  using (get_my_role() = 'coach');

-- Important : aucun acces anonyme direct a la table.
-- La page /adherent/:token passe par /api/public-adherent cote serveur.
drop policy if exists "adherent_read_own" on adherents;
drop policy if exists "public_read_by_id" on adherents;

drop policy if exists "read_own_profile" on profiles;
create policy "read_own_profile"
  on profiles for select
  using (id = auth.uid());

drop policy if exists "bureau_read_profiles" on profiles;
drop policy if exists "bureau_write_profiles" on profiles;
drop policy if exists "bureau_update_profiles" on profiles;
drop policy if exists "bureau_delete_profiles" on profiles;
drop policy if exists "bureau_manage_profiles" on profiles;
create policy "bureau_manage_profiles"
  on profiles for all
  using (get_my_role() = 'bureau')
  with check (get_my_role() = 'bureau');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
