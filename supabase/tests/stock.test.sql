-- Tests Phase 7 : réception, perte, inventaire (double validation), retour, droits, vue de pilotage.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'stock@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'ventes@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'Stock', 'stock'),
  ('00000000-0000-0000-0000-0000000000c2', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000c3', 'Ventes', 'ventes');

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

create temp table t as select
  (select id from public.variantes where sku = 'GD-WS-STD') as wax,      -- 30 en stock
  (select id from public.variantes where sku = 'GD-HCM-STD') as mousse,  -- 20 en stock
  (select id from public.produits where sku = 'GD-WS') as wax_produit;
grant select on t to anon, authenticated;
create function pg_temp.phys(v uuid) returns integer language sql as $$ select physique from public.stocks where variante_id = v $$;
grant execute on function pg_temp.phys(uuid) to anon, authenticated;

-- 1. Réception à deux lignes par le rôle stock, rejouée sans doublon.
insert into public.fournisseurs (id, nom) values ('f0000000-0000-4000-8000-000000000001', 'Fournisseur test');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
create temp table rec as select public.receptionner(jsonb_build_object(
  'cle_idempotence', 'test-reception-0001',
  'fournisseur_id', 'f0000000-0000-4000-8000-000000000001',
  'reference_fournisseur', 'BL-778',
  'lignes', jsonb_build_array(
    jsonb_build_object('variante_id', (select wax from t), 'quantite', 10, 'cout_unitaire_fcfa', 2500),
    jsonb_build_object('variante_id', (select mousse from t), 'quantite', 5)))) as id;
select public.receptionner(jsonb_build_object(
  'cle_idempotence', 'test-reception-0001',
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select wax from t), 'quantite', 10))));
reset role;
do $$ begin
  assert pg_temp.phys((select wax from t)) = 40, 'réception Wax Stick +10';
  assert pg_temp.phys((select mousse from t)) = 25, 'réception Mousse +5';
  assert (select count(*) from public.reception_lignes where reception_id = (select id from rec)) = 2, 'deux lignes';
  assert (select count(*) from public.mouvements_stock where reference_id = (select id from rec) and type = 'entree') = 2, 'deux entrées';
  assert (select auteur_id from public.receptions where id = (select id from rec)) = '00000000-0000-0000-0000-0000000000c1', 'auteur tracé';
end $$;

-- 2. Le rôle ventes ne réceptionne pas, ne déclare pas de perte, ne corrige pas.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.attendre_erreur(format($q$select public.declarer_perte(%L, 1, 'casse', 'test-perte-ventes')$q$, (select wax from t)), 'ACCES_REFUSE');
select pg_temp.attendre_erreur(format($q$select public.corriger_inventaire(%L, 1, 'inventaire', 'test-inv-ventes')$q$, (select wax from t)), 'ACCES_REFUSE');
-- 3. Perte : motif obligatoire, jamais sur du stock réservé.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.attendre_erreur(format($q$select public.declarer_perte(%L, 2, '', 'test-perte-0001')$q$, (select wax from t)), 'VALIDATION: motif');
select public.declarer_perte((select wax from t), 2, 'Flacons cassés au déballage', 'test-perte-0002');
reset role;
do $$ begin assert pg_temp.phys((select wax from t)) = 38, 'perte -2'; end $$;
select private.appliquer_mouvement_stock((select wax from t), 'reservation', 0, 36, 'manuel', null, null, 'test-resa-0001');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.attendre_erreur(format($q$select public.declarer_perte(%L, 3, 'casse', 'test-perte-0003')$q$, (select wax from t)), 'STOCK_INSUFFISANT');
-- 4. Inventaire : petit écart par le rôle stock ; gros écart réservé à l'admin.
select pg_temp.attendre_erreur(format($q$select public.corriger_inventaire(%L, 10, 'inventaire mensuel', 'test-inv-0001')$q$, (select mousse from t)), 'VALIDATION_ADMIN_REQUISE');
do $$ begin
  assert public.corriger_inventaire((select mousse from t), 22, 'inventaire mensuel', 'test-inv-0002') = -3, 'écart -3';
  assert public.corriger_inventaire((select mousse from t), 22, 'inventaire mensuel', 'test-inv-0002') = 0, 'rejeu sans effet';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
do $$ begin
  assert public.corriger_inventaire((select mousse from t), 10, 'recomptage contrôlé', 'test-inv-0003') = -12, 'gros écart validé par l''admin';
end $$;
-- Un inventaire ne peut pas descendre sous le réservé.
select pg_temp.attendre_erreur(format($q$select public.corriger_inventaire(%L, 30, 'inventaire', 'test-inv-0004')$q$, (select wax from t)), 'STOCK_INSUFFISANT');
reset role;
do $$ begin
  assert pg_temp.phys((select mousse from t)) = 10, 'mousse recomptée à 10';
  assert (select motif from public.mouvements_stock where cle_idempotence = 'test-inv-0003') like 'recomptage contrôlé (comptage : 10, théorique : 22)', 'motif enrichi';
end $$;

-- 5. Réglages d'alerte par le rôle stock ; vue de pilotage.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select public.regler_alertes_stock((select wax_produit from t), 5, 14, 7);
do $$ begin
  assert (select statut from public.vue_stock where variante_id = (select wax from t)) = 'bientot_epuise', 'wax : disponible 2 ≤ seuil 5';
  assert (select count(*) from public.vue_stock) >= 7, 'vue lisible par le personnel';
end $$;
reset role;
set local role anon;
select pg_temp.attendre_erreur('select * from public.vue_stock', 'permission denied');
reset role;

-- 6. Retour d'une commande livrée : revendable -> stock ; abîmé -> pas de remise en stock.
select private.appliquer_mouvement_stock((select mousse from t), 'entree', 5, 0, 'manuel', null, null, 'test-entree-retour');
set local role anon;
create temp table cmd as select public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'test-retour-0001',
  'cliente', jsonb_build_object('nom', 'Cliente retour', 'telephone', '+237690000888'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'), 'quartier', 'Akwa', 'point_de_repere', 'Marché'),
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select mousse from t), 'quantite', 3)))) as c;
reset role;
grant select on cmd to anon, authenticated;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
select public.confirmer_commande((select (c ->> 'id')::uuid from cmd));
select pg_temp.attendre_erreur(format($q$select public.retourner_commande(%L, '[]'::jsonb, 'retour')$q$, (select c ->> 'id' from cmd)), 'VALIDATION: lignes');
select public.expedier_commande((select (c ->> 'id')::uuid from cmd));
select pg_temp.attendre_erreur(format($q$select public.retourner_commande(%L, jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 1)), 'retour')$q$,
  (select c ->> 'id' from cmd), (select mousse from t)), 'TRANSITION_IMPOSSIBLE');
select public.livrer_commande((select (c ->> 'id')::uuid from cmd));
select public.retourner_commande((select (c ->> 'id')::uuid from cmd),
  jsonb_build_array(jsonb_build_object('variante_id', (select mousse from t), 'quantite', 1, 'revendable', true)), 'Teinte ne convient pas');
select pg_temp.attendre_erreur(format($q$select public.retourner_commande(%L, jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 3)), 'retour')$q$,
  (select c ->> 'id' from cmd), (select mousse from t)), 'VALIDATION: quantite retournee');
select public.retourner_commande((select (c ->> 'id')::uuid from cmd),
  jsonb_build_array(jsonb_build_object('variante_id', (select mousse from t), 'quantite', 2, 'revendable', false)), 'Flacons ouverts');
reset role;
do $$ begin
  -- 10 + 5 = 15 ; vente -3 = 12 ; retour revendable +1 = 13 ; 2 non revendables : pas de remise en stock.
  assert pg_temp.phys((select mousse from t)) = 13, 'stock après retours : ' || pg_temp.phys((select mousse from t));
  assert (select statut from public.commandes where id = (select (c ->> 'id')::uuid from cmd)) = 'retournee', 'commande entièrement retournée';
  assert (select count(*) from public.commande_historique where commande_id = (select (c ->> 'id')::uuid from cmd) and evenement = 'retour') = 2, 'retours historisés';
end $$;

select 'TESTS STOCK PASSÉS' as resultat;
rollback;
