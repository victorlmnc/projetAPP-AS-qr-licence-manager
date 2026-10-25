-- Migration 3 : longueur maximale des noms et emails des adhérents.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- Limites : 100 caracteres pour le nom et le prenom, 254 pour l'email
-- (longueur maximale d'une adresse email valide).
--
-- `not valid` : les fiches deja en base ne sont pas verifiees, seules les
-- creations et modifications le sont. Pour verifier aussi l'existant :
--   alter table adherents validate constraint adherents_nom_longueur;
--   (idem pour adherents_prenom_longueur et adherents_email_longueur)

begin;

alter table adherents drop constraint if exists adherents_nom_longueur;
alter table adherents add constraint adherents_nom_longueur
  check (char_length(nom) <= 100) not valid;

alter table adherents drop constraint if exists adherents_prenom_longueur;
alter table adherents add constraint adherents_prenom_longueur
  check (char_length(prenom) <= 100) not valid;

alter table adherents drop constraint if exists adherents_email_longueur;
alter table adherents add constraint adherents_email_longueur
  check (char_length(email) <= 254) not valid;

commit;
