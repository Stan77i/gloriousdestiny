-- Tests notifications : déclencheurs réels, textes issus des données, unicité, rôles, lu / non lu,
-- préférences, alertes « retour en stock » avec consentement, tâche périodique.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'ventes-notif@test.local'),
  ('00000000-0000-0000-0000-0000000000a8', 'stock-notif@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000a7', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000a8', 'Stock', 'stock');

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

create temp table v as select
  (select id from public.variantes where sku = 'GD-LG-STD') as glue,      -- stock 25, seuil 5
  (select id from public.variantes where sku = 'GD-WS-STD') as wax;
grant select on v to anon, authenticated;

-- 1. Nouvelle commande : une notification « ventes » avec le vrai contenu.
set local role anon;
create temp table c as select public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'notif-test-0001',
  'cliente', jsonb_build_object('nom', 'Awa Notif', 'telephone', '+237690000901'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Yaoundé'), 'quartier', 'Bastos', 'point_de_repere', 'Pharmacie'),
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select glue from v), 'quantite', 2))
)) as r;
reset role;
do $$ begin
  assert (select count(*) from public.notifications where type = 'commande_nouvelle') = 1, 'une notification de commande';
  assert (select corps from public.notifications where type = 'commande_nouvelle') like 'Awa Notif · 2 article(s) · 19 000 FCFA · Yaoundé%', 'contenu réel : ' || (select corps from public.notifications where type = 'commande_nouvelle');
  assert (select role_cible from public.notifications where type = 'commande_nouvelle') = 'ventes', 'destinataire ventes';
end $$;

-- 2. Stock : seuil franchi (25 → 4 disponibles avec 2 réservés), épuisement, unicité dans la journée.
select private.appliquer_mouvement_stock((select glue from v), 'perte', -19, 0, 'manuel', null, 'test', null);
select private.appliquer_mouvement_stock((select glue from v), 'perte', -1, 0, 'manuel', null, 'test', null);
do $$ begin
  assert (select count(*) from public.notifications where type = 'stock_bas') = 1, 'stock bas une seule fois';
  assert (select corps from public.notifications where type = 'stock_bas') like 'Plus que 4 disponible(s) (seuil d''alerte : 5)%', 'texte stock bas';
end $$;
select private.appliquer_mouvement_stock((select glue from v), 'perte', -3, 0, 'manuel', null, 'test', null);
do $$ begin
  assert (select count(*) from public.notifications where type = 'stock_epuise') = 1, 'épuisé';
  assert (select titre from public.notifications where type = 'stock_epuise') = 'Lace Glue est épuisé', 'titre épuisé';
  assert (select corps from public.notifications where type = 'stock_epuise') like '%2 réservée(s)%', 'réservations mentionnées';
end $$;

-- 3. « Prévenez-moi » : consentement obligatoire, numéro valide, pas pour un article disponible.
set local role anon;
select pg_temp.attendre_erreur(format('select public.demander_alerte_retour_stock(%L, %L, %L, false)', (select glue from v), 'Bintou', '+237690000902'), 'VALIDATION: consentement');
select pg_temp.attendre_erreur(format('select public.demander_alerte_retour_stock(%L, %L, %L, true)', (select glue from v), 'Bintou', '690000902'), 'VALIDATION: telephone');
do $$ begin
  assert public.demander_alerte_retour_stock((select glue from v), 'Bintou Test', '+237690000902', true) = 'enregistree', 'demande enregistrée';
  assert public.demander_alerte_retour_stock((select glue from v), 'Bintou Test', '+237690000902', true) = 'enregistree', 'rejeu sans doublon';
  assert public.demander_alerte_retour_stock((select wax from v), 'Bintou Test', '+237690000902', true) = 'disponible', 'article disponible : rien à attendre';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.alertes_retour_stock) = 1, 'une seule demande active';
  assert (select count(*) from public.notifications where type = 'alerte_stock_demandee') = 1, 'équipe informée';
end $$;

-- 4. Retour en stock : notification avec le nombre de clientes en attente et l'accroche du produit ;
--    message prêt pour la cliente.
select private.appliquer_mouvement_stock((select glue from v), 'entree', 10, 0, 'manuel', null, null, null);
do $$ begin
  assert (select corps from public.notifications where type = 'retour_stock') like '%1 cliente(s) ont demandé à être prévenue(s)%', 'clientes en attente';
  assert (select corps from public.notifications where type = 'retour_stock') like '%« La pose qui tient, sans y penser. »%', 'accroche de la fiche';
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a7';
do $$
declare a jsonb := public.alertes_a_prevenir();
begin
  assert jsonb_array_length(a) = 1, 'une cliente à prévenir';
  assert a -> 0 ->> 'message' like 'Bonjour Bintou,%Lace Glue est de nouveau disponible%', 'message prêt';
  perform public.marquer_alerte_prevenue((a -> 0 ->> 'id')::uuid);
  assert jsonb_array_length(public.alertes_a_prevenir()) = 0, 'prévenue';
end $$;

-- 5. Rôles, lu / non lu, préférences.
do $$
declare m jsonb := public.mes_notifications();
begin
  assert (select count(*) from jsonb_array_elements(m -> 'liste') x where x ->> 'type' = 'stock_bas') = 0, 'ventes ne voit pas les alertes stock';
  assert (select count(*) from jsonb_array_elements(m -> 'liste') x where x ->> 'type' = 'commande_nouvelle') = 1, 'ventes voit les commandes';
  assert (m ->> 'non_lues')::int = 3, 'non lues : ' || (m ->> 'non_lues');
  perform public.marquer_notifications_lues(array[(select (x ->> 'id')::bigint from jsonb_array_elements(m -> 'liste') x where x ->> 'type' = 'commande_nouvelle')]);
  assert (public.mes_notifications() ->> 'non_lues')::int = 2, 'une lue';
  perform public.enregistrer_preferences_notifications(array['retour_stock']);
  assert (public.mes_notifications() ->> 'non_lues')::int = 1, 'type coupé';
  perform public.marquer_notifications_lues();
  assert (public.mes_notifications() ->> 'non_lues')::int = 0, 'tout lu';
end $$;
select pg_temp.attendre_erreur($q$select public.enregistrer_preferences_notifications(array['inconnu'])$q$, 'VALIDATION');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a8';
do $$
declare m jsonb := public.mes_notifications();
begin
  assert (select count(*) from jsonb_array_elements(m -> 'liste') x where x ->> 'type' in ('stock_bas', 'stock_epuise')) = 2, 'stock voit ses alertes';
  assert (select count(*) from jsonb_array_elements(m -> 'liste') x where x ->> 'type' = 'commande_nouvelle') = 0, 'stock ne voit pas les commandes';
  assert (m ->> 'non_lues')::int = 2, 'lu par personne : ' || (m ->> 'non_lues');
end $$;
select pg_temp.attendre_erreur('select public.alertes_a_prevenir()', 'ACCES_REFUSE');
-- Lecture directe : la RLS filtre de même.
do $$ begin
  assert (select count(*) from public.notifications where type = 'commande_nouvelle') = 0, 'RLS par rôle';
  assert (select count(*) from public.alertes_retour_stock) = 0, 'téléphones des clientes invisibles au rôle stock';
end $$;
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur('select public.mes_notifications()', 'permission denied');
reset role;

-- 6. Tâche périodique : commande en attente depuis plus de 12 h, une seule fois.
update public.commandes set created_at = now() - interval '13 hours' where id = (select (r ->> 'id')::uuid from c);
select private.notifications_periodiques();
select private.notifications_periodiques();
do $$ begin
  assert (select count(*) from public.notifications where type = 'commande_attente') = 1, 'commande en attente, une fois';
end $$;

select 'TESTS NOTIFICATIONS PASSÉS' as resultat;
rollback;
