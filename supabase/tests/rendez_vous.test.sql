-- Tests Phase 9 : créneaux (horaires, tampons, fuseau, délai, exceptions), réservation
-- atomique et idempotente, anti-abus, transitions de l'équipe, annulation par la cliente.
\set ON_ERROR_STOP 1
begin;
\ir prix_reference.inc.sql

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'ventes-rdv@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'stock-rdv@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000d2', 'Stock', 'stock');

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

-- Jours de référence, dans le fuseau du salon : lundi et mardi de la semaine prochaine.
create temp table j as
with auj as (select (now() at time zone 'Africa/Douala')::date as d)
select d + (8 - extract(isodow from d)::integer) + 7 as lundi,
       d + (8 - extract(isodow from d)::integer) + 8 as mardi,
       d + (8 - extract(isodow from d)::integer) + 13 as dimanche,
       (select id from public.services where slug = 'pose-de-perruque') as perruque,  -- 120 min + 15
       (select id from public.services where slug = 'pose-de-cils') as cils           -- 90 min + 15
from auj;
grant select on j to anon, authenticated;
create function pg_temp.a(jour date, heure text) returns timestamptz language sql as $$
  select (jour + heure::time) at time zone 'Africa/Douala'
$$;
grant execute on function pg_temp.a(date, text) to anon, authenticated;
create function pg_temp.reserver(cle text, service uuid, debut timestamptz, tel text) returns jsonb language sql as $$
  select public.reserver_rendez_vous(jsonb_build_object(
    'cle_idempotence', cle, 'service_id', service, 'debut', debut,
    'cliente', jsonb_build_object('nom', 'Cliente test', 'telephone', tel)))
$$;
grant execute on function pg_temp.reserver(text, uuid, timestamptz, text) to anon, authenticated;

-- 1. Lundi 9 h – 18 h, pas de 30 min : une pose de 2 h peut commencer de 9 h 00 à 16 h 00 (15 créneaux),
--    en heure de Douala ; le dimanche est fermé.
set local role anon;
do $$ begin
  assert (select count(*) from public.creneaux_disponibles((select perruque from j), (select lundi from j), (select lundi from j))) = 15,
    'lundi : 15 créneaux pour 2 h';
  assert (select min(c) from public.creneaux_disponibles((select perruque from j), (select lundi from j), (select lundi from j)) c)
    = pg_temp.a((select lundi from j), '09:00'), 'premier créneau 9 h, heure de Douala';
  assert (select max(c) from public.creneaux_disponibles((select perruque from j), (select lundi from j), (select lundi from j)) c)
    = pg_temp.a((select lundi from j), '16:00'), 'dernier créneau 16 h (fin à 18 h)';
  assert (select count(*) from public.creneaux_disponibles((select perruque from j), (select dimanche from j), (select dimanche from j))) = 0,
    'dimanche fermé';
end $$;

-- 2. Réservation par une visiteuse : demande, référence, message WhatsApp en français ; rejeu idempotent.
create temp table r1 as select pg_temp.reserver('test-rdv-0001', (select perruque from j), pg_temp.a((select lundi from j), '10:00'), '+237690000401') as r;
grant select on r1 to anon, authenticated;
do $$ begin
  assert (select r ->> 'statut' from r1) = 'demande', 'statut demande';
  assert (select r ->> 'reference' from r1) ~ '^RDV-[0-9]{4}-[0-9]{4}$', 'référence RDV-AAMM-NNNN';
  assert (select r ->> 'message_whatsapp' from r1) like '%Pose de perruque (2 h)%', 'prestation et durée dans le message';
  assert (select r ->> 'message_whatsapp' from r1) like '%lundi % à 10 h 00%', 'date en français, heure du salon';
  assert (select (r ->> 'annulable')::boolean from r1), 'annulable';
  assert (pg_temp.reserver('test-rdv-0001', (select perruque from j), pg_temp.a((select lundi from j), '10:00'), '+237690000401') ->> 'id')
    = (select r ->> 'id' from r1), 'rejeu : même rendez-vous';
end $$;

-- 3. Chevauchement : 10 h – 12 h + 15 min de tampon bloque 9 h 00 (cils jusqu'à 10 h 45 avec tampon), 11 h et 12 h ;
--    12 h 30 reste libre. Réserver un créneau pris est refusé.
do $$ begin
  assert not exists (select 1 from public.creneaux_disponibles((select cils from j), (select lundi from j), (select lundi from j)) c
                     where c in (pg_temp.a((select lundi from j), '09:00'), pg_temp.a((select lundi from j), '11:00'), pg_temp.a((select lundi from j), '12:00'))),
    '9 h, 11 h et 12 h pris';
  assert exists (select 1 from public.creneaux_disponibles((select cils from j), (select lundi from j), (select lundi from j)) c
                 where c = pg_temp.a((select lundi from j), '12:30')), '12 h 30 libre';
end $$;
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0002', %L, %L, '+237690000402')$q$,
  (select cils from j), pg_temp.a((select lundi from j), '11:00')), 'CRENEAU_INDISPONIBLE');
-- Hors grille, hors horaires, dans le passé : refusés.
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0003', %L, %L, '+237690000402')$q$,
  (select cils from j), pg_temp.a((select lundi from j), '12:10')), 'CRENEAU_INDISPONIBLE');
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0004', %L, %L, '+237690000402')$q$,
  (select cils from j), pg_temp.a((select lundi from j), '17:00')), 'CRENEAU_INDISPONIBLE');
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0005', %L, %L, '+237690000402')$q$,
  (select cils from j), now() - interval '1 day'), 'CRENEAU_INDISPONIBLE');
-- Téléphone invalide.
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0006', %L, %L, '0690000402')$q$,
  (select cils from j), pg_temp.a((select lundi from j), '12:30')), 'VALIDATION: telephone');

-- 4. Anti-abus : deux demandes en attente par téléphone, pas trois.
select pg_temp.reserver('test-rdv-0007', (select cils from j), pg_temp.a((select mardi from j), '09:00'), '+237690000401');
select pg_temp.attendre_erreur(format($q$select pg_temp.reserver('test-rdv-0008', %L, %L, '+237690000401')$q$,
  (select cils from j), pg_temp.a((select mardi from j), '14:00')), 'TROP_DE_RENDEZ_VOUS');
reset role;

-- 5. Équipe : la visiteuse et le rôle stock ne confirment pas ; le rôle ventes confirme.
set local role anon;
select pg_temp.attendre_erreur(format($q$select public.confirmer_rendez_vous(%L)$q$, (select (r ->> 'id')::uuid from r1)), 'permission denied');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
select pg_temp.attendre_erreur(format($q$select public.confirmer_rendez_vous(%L)$q$, (select (r ->> 'id')::uuid from r1)), 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert public.confirmer_rendez_vous((select (r ->> 'id')::uuid from r1)) ->> 'statut' = 'confirme', 'confirmé';
end $$;
select pg_temp.attendre_erreur(format($q$select public.confirmer_rendez_vous(%L)$q$, (select (r ->> 'id')::uuid from r1)), 'TRANSITION_IMPOSSIBLE');
-- Clôturer avant l'heure est impossible.
select pg_temp.attendre_erreur(format($q$select public.cloturer_rendez_vous(%L, 'termine')$q$, (select (r ->> 'id')::uuid from r1)), 'TRANSITION_IMPOSSIBLE');

-- 6. Fermeture d'une journée : refusée s'il reste des rendez-vous, sinon le jour n'a plus de créneaux ; réouverture.
select pg_temp.attendre_erreur(format($q$select public.fermer_journee(%L, 'Formation')$q$, (select lundi from j)), 'RDV_EXISTANTS: 1');
select public.fermer_journee((select lundi from j) + 2, 'Formation de l''équipe');
do $$ begin
  assert (select count(*) from public.creneaux_disponibles((select cils from j), (select lundi from j) + 2, (select lundi from j) + 2)) = 0, 'mercredi fermé';
end $$;
select public.rouvrir_journee((select lundi from j) + 2);
do $$ begin
  assert (select count(*) from public.creneaux_disponibles((select cils from j), (select lundi from j) + 2, (select lundi from j) + 2)) > 0, 'mercredi rouvert';
end $$;
reset role;

-- 7. Horaires spéciaux d'un jour (exception ouverte 10 h – 12 h) : une seule pose de 2 h possible.
insert into public.exceptions_disponibilite (date, ferme, heure_debut, heure_fin, motif)
values ((select lundi from j) + 3, false, '10:00', '12:00', 'Horaires réduits');
do $$ begin
  assert (select count(*) from public.creneaux_disponibles((select perruque from j), (select lundi from j) + 3, (select lundi from j) + 3)) = 1, 'un seul créneau';
end $$;

-- 8. Annulation par la cliente : il faut le bon téléphone ; le créneau redevient libre.
set local role anon;
select pg_temp.attendre_erreur(format($q$select public.annuler_rendez_vous_cliente(%L, '+237690000999')$q$, (select r ->> 'reference' from r1)), 'RENDEZ_VOUS_INTROUVABLE');
do $$ begin
  assert public.annuler_rendez_vous_cliente((select r ->> 'reference' from r1), '+237690000401') ->> 'statut' = 'annule', 'annulé par la cliente';
  assert exists (select 1 from public.creneaux_disponibles((select perruque from j), (select lundi from j), (select lundi from j)) c
                 where c = pg_temp.a((select lundi from j), '10:00')), 'créneau libéré';
  assert public.suivre_rendez_vous((select r ->> 'reference' from r1), '+237690000401') ->> 'statut' = 'annule', 'suivi';
  assert public.suivre_rendez_vous((select r ->> 'reference' from r1), '+237690000999') is null, 'suivi : mauvais téléphone';
end $$;
reset role;
do $$ begin
  assert (select annule_par from public.rendez_vous where id = (select (r ->> 'id')::uuid from r1)) = 'cliente', 'annulation tracée';
  assert (select count(*) from public.rendez_vous_historique where rendez_vous_id = (select (r ->> 'id')::uuid from r1)) = 3,
    'historique : création, confirmation, annulation';
end $$;

-- 9. Annulation tardive refusée (moins de 3 h avant) ; clôture après l'heure par l'équipe.
create temp table r2 as select pg_temp.reserver('test-rdv-0009', (select perruque from j), pg_temp.a((select lundi from j), '14:00'), '+237690000403') as r;
grant select on r2 to anon, authenticated;
update public.rendez_vous set debut = now() + interval '1 hour', fin = now() + interval '3 hours',
  occupe_debut = now() + interval '1 hour', occupe_fin = now() + interval '3 hours 15 minutes'
where id = (select (r ->> 'id')::uuid from r2);
set local role anon;
select pg_temp.attendre_erreur(format($q$select public.annuler_rendez_vous_cliente(%L, '+237690000403')$q$, (select r ->> 'reference' from r2)), 'ANNULATION_TARDIVE');
reset role;
update public.rendez_vous set debut = now() - interval '3 hours', fin = now() - interval '1 hour',
  occupe_debut = now() - interval '3 hours', occupe_fin = now() - interval '45 minutes'
where id = (select (r ->> 'id')::uuid from r2);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.attendre_erreur(format($q$select public.annuler_rendez_vous(%L, '')$q$, (select (r ->> 'id')::uuid from r2)), 'VALIDATION: motif');
do $$ begin
  assert public.cloturer_rendez_vous((select (r ->> 'id')::uuid from r2), 'absent') ->> 'statut' = 'absent', 'absence notée';
end $$;
reset role;

-- 10. Le délai minimal : aucun créneau dans les 2 prochaines heures.
do $$ begin
  assert not exists (
    select 1 from public.creneaux_disponibles((select perruque from j), (now() at time zone 'Africa/Douala')::date, (now() at time zone 'Africa/Douala')::date) c
    where c < now() + interval '2 hours'), 'délai minimal respecté';
end $$;

-- 11. La table reste fermée aux visiteuses (lecture directe impossible).
set local role anon;
select pg_temp.attendre_erreur('select count(*) from public.rendez_vous', 'permission denied');
reset role;

select 'TESTS RENDEZ-VOUS PASSÉS' as resultat;
rollback;
