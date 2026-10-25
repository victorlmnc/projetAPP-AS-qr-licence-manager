-- Migration 7 : suivi du remboursement Pass'Sport des boursiers.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- A executer APRES la migration 6 (colonne boursier) et AVANT de deployer le
-- code qui les utilise : la fiche adherent et l'envoi des emails lisent et
-- ecrivent ces colonnes.
--
--   pass_sport_recu       Le bureau a recu le Pass'Sport de l'adherent
--   rib_recu              Le bureau a recu son RIB
--   pass_sport_rembourse  Les 50 euros lui ont ete rembourses

begin;

alter table adherents add column if not exists pass_sport_recu boolean not null default false;
alter table adherents add column if not exists rib_recu boolean not null default false;
alter table adherents add column if not exists pass_sport_rembourse boolean not null default false;

commit;
