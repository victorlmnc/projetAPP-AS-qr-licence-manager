-- ============================================
-- RESET COMPLET : Supprime tous les comptes et
-- remet le système en état "non initialisé".
-- À exécuter dans l'éditeur SQL de Supabase.
-- ============================================

-- 1) Supprimer tous les profils (bureau, coach, adherent)
delete from profiles;

-- 2) Supprimer tous les adhérents
delete from adherents;

-- 3) Remettre le flag initialized à false
update app_config set initialized = false where id = 1;

-- 4) Supprimer tous les utilisateurs de Supabase Auth
-- (nécessite d'être exécuté en tant que service_role)
delete from auth.users;
