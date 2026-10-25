-- Migration 2/2 : retirer au compte respos-sports (role coach) l'acces direct
-- a la table adherents.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- A executer APRES le deploiement du nouveau code du scan (qui passe par
-- scanner_adherent, cree par la migration 1/2) : l'ancien code lisait la
-- table directement et ne fonctionnerait plus.
--
-- Avant : le coach pouvait lire toutes les colonnes de tous les adherents
-- et recevait en temps reel toutes les modifications de la table.
-- Apres : seul le bureau lit la table. Le temps reel respecte cette policy,
-- le coach ne recoit donc plus rien.

begin;

-- (select get_my_role()) est evalue une seule fois par requete, pas par ligne.
drop policy if exists "read_adherents" on adherents;
drop policy if exists "bureau_read_adherents" on adherents;
create policy "bureau_read_adherents"
  on adherents for select
  to authenticated
  using ((select get_my_role()) = 'bureau');

drop policy if exists "bureau_insert_adherents" on adherents;
create policy "bureau_insert_adherents"
  on adherents for insert
  to authenticated
  with check ((select get_my_role()) = 'bureau');

drop policy if exists "bureau_update_adherents" on adherents;
create policy "bureau_update_adherents"
  on adherents for update
  to authenticated
  using ((select get_my_role()) = 'bureau')
  with check ((select get_my_role()) = 'bureau');

drop policy if exists "bureau_delete_adherents" on adherents;
create policy "bureau_delete_adherents"
  on adherents for delete
  to authenticated
  using ((select get_my_role()) = 'bureau');

commit;
