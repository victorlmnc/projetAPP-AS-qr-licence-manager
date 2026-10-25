-- Migration : restreindre l'acces du compte respos-sports (role coach).
-- A executer une fois dans l'editeur SQL Supabase. Le script est rejouable.
--
-- Avant : le role coach pouvait lire toutes les colonnes de tous les adherents
-- (adresse, date de naissance, situation de handicap...) et recevait en temps
-- reel toutes les modifications de la table.
-- Apres : le coach n'a plus aucun acces direct a la table. Le scan passe par
-- la fonction scanner_adherent(token), qui renvoie uniquement les champs
-- necessaires au controle, pour un seul QR code a la fois.

begin;

-- 1) Fonction de scan : un adherent par token, champs du statut uniquement.
create or replace function scanner_adherent(p_token uuid)
  returns table (
    public_token uuid,
    nom text,
    prenom text,
    questionnaire_sante_ok boolean,
    paiement_global boolean,
    manque_paiement boolean,
    manque_yeps boolean,
    manque_passport boolean,
    licence_ffsu_a_jour boolean,
    activite_contraintes boolean
  )
  language sql security definer stable
  set search_path = public
as $$
  select
    a.public_token, a.nom, a.prenom,
    a.questionnaire_sante_ok, a.paiement_global,
    a.manque_paiement, a.manque_yeps, a.manque_passport,
    a.licence_ffsu_a_jour, a.activite_contraintes
  from adherents a
  where a.public_token = p_token
    and (select get_my_role()) in ('bureau', 'coach');
$$;

-- Supabase accorde par defaut l'execution a anon : on la retire explicitement.
revoke execute on function scanner_adherent(uuid) from public, anon;
grant execute on function scanner_adherent(uuid) to authenticated;

revoke execute on function get_my_role() from public, anon;
grant execute on function get_my_role() to authenticated, service_role;

-- 2) Lecture directe de la table reservee au bureau.
--    Le temps reel respecte cette policy : le coach ne recoit plus rien.
--    (select get_my_role()) est evalue une seule fois par requete, pas par ligne.
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
