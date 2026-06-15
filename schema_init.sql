-- ============================================
-- Schéma : Initialisation Admin & Réinitialisation
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- ============================================
-- Table de configuration de l'application
-- Une seule ligne (id = 1), contient le hash
-- de la clé maîtresse et le flag d'initialisation.
-- ============================================
create table if not exists app_config (
  id int primary key default 1 check (id = 1),
  master_key_hash text not null,
  initialized boolean not null default false
);

-- Désactiver RLS sur app_config (accès contrôlé via les RPC security definer)
alter table app_config enable row level security;

-- Aucune policy directe : seules les fonctions security definer y accèdent.

-- ============================================
-- Insertion de la clé secrète hashée.
-- Cette commande ne doit être exécutée qu'UNE SEULE FOIS.
-- ============================================
insert into app_config (master_key_hash, initialized)
values (encode(digest('INSA-AS-ADMIN-KEY-2026-SECURITY-ACTIVE99', 'sha256'), 'hex'), false);


-- ============================================
-- RPC : Vérifie si le système est déjà initialisé
-- Retourne true si un profil 'bureau' existe.
-- Accessible par tout le monde (anon).
-- ============================================
create or replace function check_initialized()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select initialized from app_config where id = 1),
    false
  );
$$;


-- ============================================
-- RPC : Initialise le premier compte administrateur
-- Paramètres :
--   p_key     : la clé secrète en clair (40 chars)
--   p_user_id : l'UUID du user créé via supabase.auth.signUp()
-- Vérifie que :
--   1) Le système n'est pas encore initialisé
--   2) La clé fournie correspond au hash stocké
-- Crée le profil 'bureau' et marque initialized = true.
-- ============================================
create or replace function initialize_admin(p_key text, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_hash text;
  v_stored_hash text;
  v_initialized boolean;
begin
  -- Vérifier que la config existe
  select master_key_hash, initialized
  into v_stored_hash, v_initialized
  from app_config
  where id = 1;

  if v_stored_hash is null then
    raise exception 'Configuration non trouvée. Exécutez d''abord le script d''insertion de la clé.';
  end if;

  -- Vérifier que le système n'est pas déjà initialisé
  if v_initialized then
    raise exception 'Le système est déjà initialisé. Un compte administrateur existe déjà.';
  end if;

  -- Vérifier la clé
  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  if v_hash <> v_stored_hash then
    raise exception 'Clé secrète invalide.';
  end if;

  -- Créer le profil bureau
  insert into profiles (id, role)
  values (p_user_id, 'bureau')
  on conflict (id) do update set role = 'bureau';

  -- Marquer comme initialisé
  update app_config set initialized = true where id = 1;
end;
$$;


-- ============================================
-- RPC : Réinitialise tous les adhérents
-- Paramètres :
--   p_key : la clé secrète en clair (40 chars)
-- Vérifie que :
--   1) L'appelant est connecté et a le rôle 'bureau'
--   2) La clé fournie correspond au hash stocké
-- Supprime toutes les lignes de la table adherents
-- et tous les profils de rôle 'adherent'.
-- ============================================
create or replace function reset_adherents(p_key text)
returns json
language plpgsql
security definer
as $$
declare
  v_hash text;
  v_stored_hash text;
  v_caller_role text;
  v_deleted_adherents int;
  v_deleted_profiles int;
begin
  -- Vérifier que l'appelant est bureau
  select role into v_caller_role
  from profiles
  where id = auth.uid();

  if v_caller_role is null or v_caller_role <> 'bureau' then
    raise exception 'Accès refusé. Seul un administrateur peut réinitialiser.';
  end if;

  -- Vérifier la clé
  select master_key_hash into v_stored_hash
  from app_config
  where id = 1;

  if v_stored_hash is null then
    raise exception 'Configuration non trouvée.';
  end if;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  if v_hash <> v_stored_hash then
    raise exception 'Clé secrète invalide.';
  end if;

  -- Supprimer tous les profils adhérents
  delete from profiles where role = 'adherent';
  get diagnostics v_deleted_profiles = row_count;

  -- Supprimer tous les adhérents
  delete from adherents;
  get diagnostics v_deleted_adherents = row_count;

  return json_build_object(
    'deleted_adherents', v_deleted_adherents,
    'deleted_profiles', v_deleted_profiles
  );
end;
$$;
