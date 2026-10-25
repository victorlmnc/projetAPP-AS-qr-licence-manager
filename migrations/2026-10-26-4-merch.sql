-- Migration 4 : merch (maillot avec flocage en option, short) et suivi de la remise.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- Formules du site de paiement -> articles :
--   Licence + maillot           -> maillot
--   Licence + ensemble          -> maillot + short
--   Maillot seul / Short seul   -> maillot / short
--   Flocage (nom au dos)        -> option du maillot (flocage + texte)
-- (« avec YEPS » concerne le paiement : case manque_yeps existante.)
--
-- Le flocage est remis avec le maillot : pas de case « récupéré » à part.

begin;

alter table adherents add column if not exists maillot boolean not null default false;
alter table adherents add column if not exists taille_maillot text;
alter table adherents add column if not exists maillot_recupere boolean not null default false;
alter table adherents add column if not exists flocage boolean not null default false;
alter table adherents add column if not exists texte_flocage text;

alter table adherents add column if not exists short boolean not null default false;
alter table adherents add column if not exists taille_short text;
alter table adherents add column if not exists short_recupere boolean not null default false;

-- Colonne d'une première version de ce script, si elle a déjà été créée.
alter table adherents drop column if exists flocage_recupere;

-- Le texte floqué au dos reste court (même limite que le formulaire).
alter table adherents drop constraint if exists adherents_texte_flocage_longueur;
alter table adherents add constraint adherents_texte_flocage_longueur
  check (char_length(texte_flocage) <= 20) not valid;

-- Pas de flocage sans maillot.
alter table adherents drop constraint if exists adherents_flocage_sur_maillot;
alter table adherents add constraint adherents_flocage_sur_maillot
  check (not flocage or maillot) not valid;

commit;
