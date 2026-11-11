-- Tests prestations sur demande : catalogue, demande publique, validations, anti-abus,
-- notification, droits, traitement par l'équipe, agenda protégé.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'ventes-presta@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'stock-presta@test.local');
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
create temp table r (j jsonb);
grant select, insert on r to anon, authenticated;
create function pg_temp.demande(cle text, service text, tel text, jours int, heure text) returns jsonb
language sql as $$
  select jsonb_build_object('cle_idempotence', cle, 'service', service, 'nom', 'Cliente Test',
    'telephone', tel, 'date', ((now() at time zone 'Africa/Douala')::date + jours)::text, 'heure', heure,
    'precision', 'Perruque 24 pouces')
$$;
grant execute on function pg_temp.demande(text, text, text, int, text) to anon, authenticated;

-- 1. Les quatre prestations et leurs prix, visibles du public.
set local role anon;
do $$ begin
  assert (select count(*) from public.services where mode_reservation = 'demande' and publie) = 4, '4 prestations';
  assert (select prix_fcfa from public.services where slug = 'pose-frontale') = 5000, 'pose frontale 5 000';
  assert (select prix_fcfa from public.services where slug = 'traitement-de-perruque') = 3000, 'traitement 3 000';
  assert (select prix_fcfa from public.services where slug = 'coloration-de-perruque') = 10000, 'coloration 10 000';
  assert (select prix_fcfa from public.services where slug = 'montage-de-perruque') = 2000, 'montage 2 000';
  assert (select count(*) from public.services where mode_reservation = 'creneau' and publie) >= 3, 'créneaux intacts';
end $$;
select pg_temp.attendre_erreur('select * from public.demandes_prestations', 'permission');

-- 2. Demande publique valide : en attente, prix serveur, notification.
insert into r select public.demander_prestation(pg_temp.demande('cle-test-0001', 'pose-frontale', '+237670000001', 3, '10:30'));
do $$ begin
  assert (select j ->> 'statut' from r) = 'en_attente', 'jamais confirmée d’office';
  assert (select j ->> 'prix_fcfa' from r) = '5000', 'prix du serveur';
  assert (select j ->> 'reference' from r) like 'PR-%', 'référence';
  assert (select j ->> 'message_whatsapp' from r) like '%Pose frontale%5 000 FCFA%10 h 30%Perruque 24 pouces%disponibilité%', 'message WhatsApp';
  assert (select j ->> 'message_whatsapp' from r) not like '%confirmé%', 'jamais « confirmé »';
end $$;
-- Rejouée avec la même clé : la même demande, pas de doublon.
insert into r select public.demander_prestation(pg_temp.demande('cle-test-0001', 'pose-frontale', '+237670000001', 3, '10:30'));
reset role;
do $$ begin
  assert (select count(distinct j ->> 'reference') from r) = 1, 'idempotente';
  assert (select count(*) from public.demandes_prestations) = 1, 'une seule ligne';
  assert (select count(*) from public.notifications where type = 'rdv_nouveau' and titre like 'Demande de prestation%') = 1, 'équipe prévenue';
end $$;

-- 3. Validations.
set local role anon;
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0002', 'pose-de-perruque', '+237670000001', 3, '10:30'))$q$, 'SERVICE_INDISPONIBLE');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0003', 'inconnue', '+237670000001', 3, '10:30'))$q$, 'SERVICE_INDISPONIBLE');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0004', 'pose-frontale', '12', 3, '10:30'))$q$, 'telephone');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0005', 'pose-frontale', '+237670000001', -1, '10:30'))$q$, 'date');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0006', 'pose-frontale', '+237670000001', 400, '10:30'))$q$, 'date');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0007', 'pose-frontale', '+237670000001', 3, '03:00'))$q$, 'heure');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0008', 'pose-frontale', '+237670000001', 3, 'midi'))$q$, 'date');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('court', 'pose-frontale', '+237670000001', 3, '10:30'))$q$, 'identifiant');
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0009', 'pose-frontale', '+237670000001', 3, '10:30') || '{"nom":"A"}')$q$, 'nom');

-- 4. Anti-abus : trois demandes en attente par numéro sur 24 h.
insert into r select public.demander_prestation(pg_temp.demande('cle-test-0010', 'coloration-de-perruque', '+237670000001', 4, '11:00'));
insert into r select public.demander_prestation(pg_temp.demande('cle-test-0011', 'montage-de-perruque', '+237670000001', 5, '12:00'));
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0012', 'traitement-de-perruque', '+237670000001', 6, '12:00'))$q$, 'TROP_DE_DEMANDES');

-- 5. Une prestation dépubliée n'est plus demandable.
reset role;
update public.services set publie = false where slug = 'traitement-de-perruque';
set local role anon;
select pg_temp.attendre_erreur($q$select public.demander_prestation(pg_temp.demande('cle-test-0013', 'traitement-de-perruque', '+237670000002', 3, '10:30'))$q$, 'SERVICE_INDISPONIBLE');
select pg_temp.attendre_erreur($q$select public.traiter_demande_prestation(gen_random_uuid(), 'acceptee')$q$, 'permission');
reset role;
update public.services set publie = true where slug = 'traitement-de-perruque';

-- 6. Droits et traitement : le stock ne traite pas ; les ventes acceptent, une seule fois.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select pg_temp.attendre_erreur($q$select public.traiter_demande_prestation((select id from public.demandes_prestations limit 1), 'acceptee')$q$, 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select count(*) from public.demandes_prestations) = 3, 'les ventes voient les demandes';
end $$;
select public.traiter_demande_prestation((select id from public.demandes_prestations where cle_idempotence = 'cle-test-0001'), 'acceptee');
select pg_temp.attendre_erreur($q$select public.traiter_demande_prestation((select id from public.demandes_prestations where cle_idempotence = 'cle-test-0001'), 'refusee')$q$, 'TRANSITION_IMPOSSIBLE');
select pg_temp.attendre_erreur($q$select public.traiter_demande_prestation((select id from public.demandes_prestations where cle_idempotence = 'cle-test-0010'), 'n_importe')$q$, 'statut');
do $$ begin
  assert (select statut from public.demandes_prestations where cle_idempotence = 'cle-test-0001') = 'acceptee', 'acceptée';
  assert (select traitee_par from public.demandes_prestations where cle_idempotence = 'cle-test-0001') = '00000000-0000-0000-0000-0000000000f1', 'traitée par';
end $$;
-- Écriture directe interdite.
select pg_temp.attendre_erreur($q$update public.demandes_prestations set statut = 'acceptee'$q$, 'permission');

-- 7. Historique jamais supprimé ; agenda réservé aux prestations à créneau.
reset role;
select pg_temp.attendre_erreur($q$delete from public.demandes_prestations$q$, 'HISTORIQUE_IMMUABLE');
select pg_temp.attendre_erreur($q$insert into public.services (slug, nom, type, prix_fcfa) values ('sans-duree', 'Sans durée', 'autre', 1000)$q$, 'services_duree_creneau');
select pg_temp.attendre_erreur($q$insert into public.rendez_vous (service_id) values ((select id from public.services where slug = 'pose-frontale'))$q$, 'sur demande');

select 'TESTS PRESTATIONS PASSÉS' as resultat;
rollback;
