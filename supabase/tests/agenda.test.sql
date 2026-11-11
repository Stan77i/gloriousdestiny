-- Tests agenda v2 : blocage manuel, report, rappels, ouverture tardive (jusqu'à 23 h).
\set ON_ERROR_STOP 1
begin;
-- Les services à créneau de départ sont archivés en production (20261112230000) ; le moteur
-- d'agenda reste testé sur eux, restaurés le temps de cette transaction.
update public.services set publie = true, archive_at = null
where slug in ('pose-de-perruque', 'pose-de-cils', 'entretien-de-perruque');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'ventes-agenda@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'stock-agenda@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000f2', 'Stock', 'stock');

create function pg_temp.attendre_erreur(sql text, attendu text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ECHEC: aucune erreur pour [%]', sql;
exception when others then
  if sqlerrm like 'ECHEC:%' then raise; end if;
  if position(attendu in sqlerrm) = 0 then
    raise exception 'ECHEC: erreur inattendue pour [%] : % (attendu %)', sql, sqlerrm, attendu;
  end if;
end $$;
grant execute on function pg_temp.attendre_erreur(text, text) to anon, authenticated;

create temp table j as
with auj as (select (now() at time zone 'Africa/Douala')::date as d)
select d + (8 - extract(isodow from d)::integer) + 7 as lundi,
       d + (8 - extract(isodow from d)::integer) + 12 as samedi,
       (select id from public.services where slug = 'pose-de-perruque') as perruque,
       (select id from public.services where slug = 'pose-de-cils') as cils
from auj;
grant select on j to anon, authenticated;
create function pg_temp.a(jour date, heure text) returns timestamptz language sql as $$
  select (jour + heure::time) at time zone 'Africa/Douala'
$$;
grant execute on function pg_temp.a(date, text) to anon, authenticated;
create function pg_temp.reserver(cle text, service uuid, debut timestamptz, tel text) returns jsonb language sql as $$
  select public.reserver_rendez_vous(jsonb_build_object(
    'cle_idempotence', cle, 'service_id', service, 'debut', debut,
    'cliente', jsonb_build_object('nom', 'Mireille Test', 'telephone', tel)))
$$;
grant execute on function pg_temp.reserver(text, uuid, timestamptz, text) to anon, authenticated;

-- 1. Ouverture tardive : le samedi de 10 h à 23 h, une pose de cils (1 h 30) peut commencer à 21 h 30.
update public.disponibilites_services set heure_debut = '10:00', heure_fin = '23:00' where jour_semaine = 6;
set local role anon;
do $$ begin
  assert (select max(c) from public.creneaux_disponibles((select cils from j), (select samedi from j), (select samedi from j)) c)
    = pg_temp.a((select samedi from j), '21:30'), 'dernier créneau 21 h 30 (fin à 23 h)';
end $$;
reset role;

-- 2. Blocage manuel du lundi 14 h – 16 h : plus proposé, réservation refusée, refus si des
--    rendez-vous existent, droits.
set local role anon;
create temp table r1 as select pg_temp.reserver('agenda-test-0001', (select perruque from j), pg_temp.a((select lundi from j), '10:00'), '+237690000601') as r;
reset role;
grant select on r1 to anon, authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select pg_temp.attendre_erreur($q$select public.bloquer_creneau(now() + interval '1 day', now() + interval '2 days', 'Formation')$q$, 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.attendre_erreur(format('select public.bloquer_creneau(%L, %L, %L)',
  pg_temp.a((select lundi from j), '11:00'), pg_temp.a((select lundi from j), '13:00'), 'Formation'), 'RDV_EXISTANTS');
select pg_temp.attendre_erreur(format('select public.bloquer_creneau(%L, %L, %L)',
  pg_temp.a((select lundi from j), '16:00'), pg_temp.a((select lundi from j), '14:00'), 'Formation'), 'VALIDATION');
select pg_temp.attendre_erreur(format('select public.bloquer_creneau(%L, %L, %L)',
  pg_temp.a((select lundi from j), '14:00'), pg_temp.a((select lundi from j), '16:00'), 'x'), 'VALIDATION');
create temp table b as select public.bloquer_creneau(pg_temp.a((select lundi from j), '14:00'), pg_temp.a((select lundi from j), '16:00'), 'Formation de l’équipe') as id;
grant select on b to anon, authenticated;
select pg_temp.attendre_erreur(format('select public.bloquer_creneau(%L, %L, %L)',
  pg_temp.a((select lundi from j), '15:00'), pg_temp.a((select lundi from j), '17:00'), 'Autre'), 'CRENEAU_INDISPONIBLE');
reset role;

set local role anon;
do $$ begin
  -- Cils (1 h 30 + 15) : 12 h 30 se termine à 14 h 15, chevauche le blocage ; 16 h 00 libre.
  assert not exists (select 1 from public.creneaux_disponibles((select cils from j), (select lundi from j), (select lundi from j)) c
    where c in (pg_temp.a((select lundi from j), '12:30'), pg_temp.a((select lundi from j), '14:00'), pg_temp.a((select lundi from j), '15:30'))),
    'plage bloquée non proposée';
  assert exists (select 1 from public.creneaux_disponibles((select cils from j), (select lundi from j), (select lundi from j)) c
    where c = pg_temp.a((select lundi from j), '16:00')), '16 h libre';
end $$;
select pg_temp.attendre_erreur(format('select pg_temp.reserver(%L, %L, %L, %L)', 'agenda-test-0002',
  (select cils from j), pg_temp.a((select lundi from j), '14:00'), '+237690000602'), 'CRENEAU_INDISPONIBLE');
reset role;
-- Même un enregistrement direct (hors fonction) est refusé par la base.
select pg_temp.attendre_erreur(format($q$insert into public.rendez_vous (cliente_id, service_id, debut, fin, occupe_debut, occupe_fin)
  select cliente_id, service_id, %L, %L, %L, %L from public.rendez_vous limit 1$q$,
  pg_temp.a((select lundi from j), '14:30'), pg_temp.a((select lundi from j), '15:00'),
  pg_temp.a((select lundi from j), '14:30'), pg_temp.a((select lundi from j), '15:00')), 'CRENEAU_INDISPONIBLE');

-- 3. Report : seulement vers un créneau libre ; l'ancien créneau est libéré ; historique.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert exists (select 1 from public.creneaux_report((select (r ->> 'id')::uuid from r1), (select lundi from j)) c
    where c = pg_temp.a((select lundi from j), '10:30')), 'report : le rendez-vous ne se bloque pas lui-même';
  assert not exists (select 1 from public.creneaux_report((select (r ->> 'id')::uuid from r1), (select lundi from j)) c
    where c = pg_temp.a((select lundi from j), '13:00')), 'report : pas sur la plage bloquée';
end $$;
select pg_temp.attendre_erreur(format('select public.reprogrammer_rendez_vous(%L, %L)', (select r ->> 'id' from r1),
  pg_temp.a((select lundi from j), '13:00')), 'CRENEAU_INDISPONIBLE');
select public.reprogrammer_rendez_vous((select (r ->> 'id')::uuid from r1), pg_temp.a((select lundi from j), '16:00'), 'Demande de la cliente');
do $$ begin
  assert (select debut from public.rendez_vous where id = (select (r ->> 'id')::uuid from r1)) = pg_temp.a((select lundi from j), '16:00'), 'nouvelle heure';
  assert (select fin - debut from public.rendez_vous where id = (select (r ->> 'id')::uuid from r1)) = interval '2 hours', 'même durée';
  assert (select occupe_fin from public.rendez_vous where id = (select (r ->> 'id')::uuid from r1)) = pg_temp.a((select lundi from j), '18:15'), 'même battement';
  assert (select count(*) from public.rendez_vous_historique where rendez_vous_id = (select (r ->> 'id')::uuid from r1) and evenement = 'report') = 1, 'report tracé';
  assert exists (select 1 from public.creneaux_report((select (r ->> 'id')::uuid from r1), (select lundi from j)) c
    where c = pg_temp.a((select lundi from j), '10:00')), 'ancien créneau libéré';
end $$;

-- 4. Retrait du blocage : la plage redevient proposée.
select public.retirer_blocage((select id from b));
select pg_temp.attendre_erreur(format('select public.retirer_blocage(%L)', (select id from b)), 'BLOCAGE_INTROUVABLE');
reset role;
set local role anon;
do $$ begin
  assert exists (select 1 from public.creneaux_disponibles((select cils from j), (select lundi from j), (select lundi from j)) c
    where c = pg_temp.a((select lundi from j), '14:00')), 'plage débloquée';
end $$;
reset role;

-- 5. Rappels : un rendez-vous dans les prochaines 24 h apparaît, avec un message prêt ; une fois
--    marqué envoyé, il disparaît ; un report le remet dans la liste.
update public.rendez_vous set debut = now() + interval '20 hours', fin = now() + interval '22 hours',
  occupe_debut = now() + interval '20 hours', occupe_fin = now() + interval '22 hours 15 minutes'
where id = (select (r ->> 'id')::uuid from r1);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$
declare l jsonb := public.rappels_a_envoyer();
begin
  assert jsonb_array_length(l) = 1, 'un rappel à envoyer';
  assert l -> 0 ->> 'message' like 'Bonjour Mireille,%', 'message personnalisé : ' || (l -> 0 ->> 'message');
  assert l -> 0 ->> 'message' like '%Pose de perruque%', 'prestation dans le message';
  assert l -> 0 ->> 'telephone' = '+237690000601', 'numéro de la cliente';
end $$;
select public.marquer_rappel_envoye((select (r ->> 'id')::uuid from r1));
select public.marquer_rappel_envoye((select (r ->> 'id')::uuid from r1));
do $$ begin
  assert jsonb_array_length(public.rappels_a_envoyer()) = 0, 'rappel parti';
  assert (select count(*) from public.rendez_vous_historique where rendez_vous_id = (select (r ->> 'id')::uuid from r1) and evenement = 'rappel') = 1, 'un seul rappel tracé';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select pg_temp.attendre_erreur('select public.rappels_a_envoyer()', 'ACCES_REFUSE');
reset role;

select 'TESTS AGENDA PASSÉS' as resultat;
rollback;
