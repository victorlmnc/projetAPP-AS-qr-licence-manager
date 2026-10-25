-- Migration 1/2 : fonction de scan pour le compte respos-sports (role coach).
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- Sans risque pour le site en ligne : la fonction est seulement ajoutee,
-- aucun acces existant n'est retire. A executer AVANT de deployer le nouveau
-- code du scan, qui l'utilise.
--
-- La fonction renvoie un seul adherent, par token, avec uniquement les champs
-- necessaires au controle (pas d'adresse, de date de naissance ni de donnees
-- medicales).

begin;

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

commit;
