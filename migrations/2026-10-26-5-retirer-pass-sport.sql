-- Migration 5 : retrait du Pass'Sport.
-- A executer dans l'editeur SQL Supabase. Le script est rejouable.
--
-- L'adherent paie le tarif normal, puis envoie son Pass'Sport par mail au
-- bureau qui le rembourse : l'aide n'entre plus dans le statut de la licence.
--
-- A executer APRES avoir deploye le code qui n'utilise plus la colonne :
-- l'ancien code la lit encore (page publique, envoi des emails).

begin;

-- La fonction de scan renvoie la colonne : on la recree sans. Le type de
-- retour change, donc « create or replace » ne suffit pas.
drop function if exists scanner_adherent(uuid);

create function scanner_adherent(p_token uuid)
  returns table (
    public_token uuid,
    nom text,
    prenom text,
    questionnaire_sante_ok boolean,
    paiement_global boolean,
    manque_paiement boolean,
    manque_yeps boolean,
    licence_ffsu_a_jour boolean,
    activite_contraintes boolean
  )
  language sql security definer stable
  set search_path = public
as $$
  select
    a.public_token, a.nom, a.prenom,
    a.questionnaire_sante_ok, a.paiement_global,
    a.manque_paiement, a.manque_yeps,
    a.licence_ffsu_a_jour, a.activite_contraintes
  from adherents a
  where a.public_token = p_token
    and (select get_my_role()) in ('bureau', 'coach');
$$;

revoke execute on function scanner_adherent(uuid) from public, anon;
grant execute on function scanner_adherent(uuid) to authenticated;

alter table adherents drop column if exists manque_passport;

commit;
