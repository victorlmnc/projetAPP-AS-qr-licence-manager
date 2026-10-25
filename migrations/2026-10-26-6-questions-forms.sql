-- Migration 6 : questions du formulaire d'inscription qui n'etaient pas importees.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- A executer AVANT de deployer le code qui les importe : l'import et la fiche
-- adherent ecrivent ces colonnes.
--
--   sports                      « Sport principal » (plusieurs choix possibles)
--   competitions_universitaires « Je vais participer aux compétitions universitaires »
--   licencie_annee_derniere     « J'étais licencié(e) à l'AS INSA CVL l'année dernière »
--   honorabilite_attestee       Attestation du contrôle d'honorabilité (encadrants)

begin;

alter table adherents add column if not exists sports text[];
alter table adherents add column if not exists competitions_universitaires boolean not null default false;
alter table adherents add column if not exists licencie_annee_derniere boolean not null default false;
alter table adherents add column if not exists honorabilite_attestee boolean not null default false;

commit;
