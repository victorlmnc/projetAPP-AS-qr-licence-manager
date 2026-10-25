-- Migration 8 : licence arbitre obtenue.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- types_licence contient les licences demandees dans le formulaire ; cette case
-- dit si le bureau a obtenu la licence arbitre. Les licences sportive et
-- encadrant suivent le statut du dossier (et le controle d'honorabilite pour
-- l'encadrant). FFSU : demandee = competitions_universitaires, obtenue =
-- licence_ffsu_a_jour, colonnes existantes.
--
-- A executer AVANT de deployer le code qui l'utilise : la fiche adherent et
-- l'envoi des emails lisent et ecrivent cette colonne.

begin;

alter table adherents add column if not exists licence_arbitre_obtenue boolean not null default false;

commit;
