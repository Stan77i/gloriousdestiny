-- Tests Phase 5 : commande de bout en bout, concurrence logique, droits, expiration.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ventes@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'logistique@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'stock@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000a2', 'Logistique', 'logistique'),
  ('00000000-0000-0000-0000-0000000000a3', 'Stock', 'stock');

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

-- Variantes de la gamme réelle
create temp table t as
select
  (select id from public.variantes where sku = 'GD-LG-STD') as lace_glue,     -- stock 25, 9 500 FCFA
  (select id from public.variantes where sku = 'GD-LGRS-STD') as remover,     -- stock 12, 5 500 FCFA
  (select id from public.villes where nom = 'Douala') as douala,
  (select id from public.villes where nom = 'Abidjan') as abidjan;
grant select on t to anon, authenticated;

create function pg_temp.payload(cle text, tel text, ville smallint, lignes jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', 'Awa Test', 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', ville, 'quartier', 'Bonapriso', 'point_de_repere', 'Face pharmacie'),
    'lignes', lignes
  )
$$;
grant execute on function pg_temp.payload(text, text, smallint, jsonb) to anon, authenticated;

-- 1. Une visiteuse commande : prix serveur, stock réservé, livraison créée.
set local role anon;
set local request.jwt.claim.sub = '';
create temp table r1 as select public.creer_commande(pg_temp.payload(
  'test-commande-0001', '+237690000101', (select douala from t),
  jsonb_build_array(
    jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 2),
    jsonb_build_object('variante_id', (select remover from t), 'quantite', 1),
    -- même variante en deux lignes : cumulée
    jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 1)
  ))) as r;
reset role;
grant select on r1 to anon, authenticated;
do $$
declare r jsonb := (select r from r1);
begin
  assert r ->> 'reference' ~ '^GD-[0-9]{4}-[0-9]{4,}$', 'référence lisible';
  assert (r ->> 'total_fcfa')::int = 3 * 9500 + 5500, 'total recalculé par le serveur : ' || (r ->> 'total_fcfa');
  assert r ->> 'statut' = 'nouvelle', 'statut nouvelle';
  assert r ->> 'devise' = 'XAF', 'devise du Cameroun';
  assert jsonb_array_length(r -> 'lignes') = 2, 'lignes cumulées par variante';
  assert (select reserve from public.stocks s join t on s.variante_id = t.lace_glue) = 3, 'stock Lace Glue réservé';
  assert (select disponible from public.stocks s join t on s.variante_id = t.lace_glue) = 22, 'disponible 25 - 3';
  assert (select count(*) from public.livraisons l where l.commande_id = (r ->> 'id')::uuid and l.statut = 'a_preparer') = 1, 'livraison à préparer';
  assert (select count(*) from public.commande_historique h where h.commande_id = (r ->> 'id')::uuid) = 1, 'historique de création';
end $$;

-- 2. Double envoi : même commande, aucun stock réservé en plus.
set local role anon;
create temp table r2 as select public.creer_commande(pg_temp.payload(
  'test-commande-0001', '+237690000101', (select douala from t),
  jsonb_build_array(jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 5)))) as r;
reset role;
do $$ begin
  assert (select r ->> 'id' from r2) = (select r ->> 'id' from r1), 'idempotence';
  assert (select reserve from public.stocks s join t on s.variante_id = t.lace_glue) = 3, 'pas de double réservation';
end $$;

-- 3. Refus : stock insuffisant (rien n'est écrit), téléphone d'un autre pays, panier vide, produit inconnu.
set local role anon;
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0002', '+237690000102', %s::smallint,
  jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 1), jsonb_build_object('variante_id', %L, 'quantite', 13))))$q$,
  (select douala from t), (select lace_glue from t), (select remover from t)), 'STOCK_INSUFFISANT: Lace Glue Remover Spray');
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0003', '+237690000103', %s::smallint,
  jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 1))))$q$, (select abidjan from t), (select lace_glue from t)), 'VALIDATION: telephone');
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0004', '+237690000104', %s::smallint, '[]'::jsonb))$q$,
  (select douala from t)), 'VALIDATION: panier');
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0005', '+237690000105', %s::smallint,
  jsonb_build_array(jsonb_build_object('variante_id', 'pas-un-uuid', 'quantite', 1))))$q$, (select douala from t)), 'PRODUIT_INDISPONIBLE');
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0006', '+237690000106', %s::smallint,
  jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 21))))$q$, (select douala from t), (select lace_glue from t)), 'VALIDATION: quantite');
reset role;
do $$ begin
  assert (select reserve from public.stocks s join t on s.variante_id = t.lace_glue) = 3, 'commande refusée : aucune réservation partielle';
  assert not exists (select 1 from public.commandes where cle_idempotence = 'test-commande-0002'), 'commande refusée : rien en base';
end $$;

-- 4. Abidjan : téléphone ivoirien, devise XOF.
set local role anon;
create temp table r3 as select public.creer_commande(pg_temp.payload(
  'test-commande-0007', '+2250707070707', (select abidjan from t),
  jsonb_build_array(jsonb_build_object('variante_id', (select remover from t), 'quantite', 2)))) as r;
reset role;
grant select on r3 to anon, authenticated;
do $$ begin assert (select r ->> 'devise' from r3) = 'XOF', 'devise XOF à Abidjan'; end $$;

-- 5. Anti-abus : 3 commandes non confirmées max par téléphone sur 24 h.
set local role anon;
select public.creer_commande(pg_temp.payload('test-commande-0008', '+237690000199', (select douala from t),
  jsonb_build_array(jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 1))));
select public.creer_commande(pg_temp.payload('test-commande-0009', '+237690000199', (select douala from t),
  jsonb_build_array(jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 1))));
select public.creer_commande(pg_temp.payload('test-commande-0010', '+237690000199', (select douala from t),
  jsonb_build_array(jsonb_build_object('variante_id', (select lace_glue from t), 'quantite', 1))));
select pg_temp.attendre_erreur(format($q$select public.creer_commande(pg_temp.payload('test-commande-0011', '+237690000199', %s::smallint,
  jsonb_build_array(jsonb_build_object('variante_id', %L, 'quantite', 1))))$q$, (select douala from t), (select lace_glue from t)), 'TROP_DE_COMMANDES');

-- 6. Suivi public : référence + bon téléphone seulement.
do $$ begin
  assert public.suivre_commande((select r ->> 'reference' from r1), '+237690000101') is not null, 'suivi avec le bon téléphone';
  assert public.suivre_commande((select r ->> 'reference' from r1), '+237690000999') is null, 'suivi refusé avec un autre téléphone';
end $$;

-- 7. Une visiteuse ne peut ni confirmer, ni lire les commandes.
select pg_temp.attendre_erreur(format('select public.confirmer_commande(%L)', (select r ->> 'id' from r1)), 'permission denied');
select pg_temp.attendre_erreur('select * from public.commandes', 'permission denied');
reset role;

-- 8. Le rôle stock ne confirme pas ; le rôle ventes confirme ; la logistique expédie et livre.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.attendre_erreur(format('select public.confirmer_commande(%L)', (select r ->> 'id' from r1)), 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.confirmer_commande((select (r ->> 'id')::uuid from r1));
select pg_temp.attendre_erreur(format('select public.confirmer_commande(%L)', (select r ->> 'id' from r1)), 'TRANSITION_IMPOSSIBLE');
select pg_temp.attendre_erreur(format('select public.livrer_commande(%L)', (select r ->> 'id' from r1)), 'TRANSITION_IMPOSSIBLE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select public.expedier_commande((select (r ->> 'id')::uuid from r1));
reset role;
do $$ begin
  assert (select physique from public.stocks s join t on s.variante_id = t.lace_glue) = 22, 'expédition : physique 25 - 3';
  assert (select reserve from public.stocks s join t on s.variante_id = t.lace_glue) = 3, 'réservé restant : les 3 commandes anti-abus (1 chacune)';
  assert (select statut from public.livraisons where commande_id = (select (r ->> 'id')::uuid from r1)) = 'expediee', 'livraison expédiée';
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.attendre_erreur(format('select public.annuler_commande(%L, %L)', (select r ->> 'id' from r1), 'test'), 'ACCES_REFUSE');
select public.livrer_commande((select (r ->> 'id')::uuid from r1));
select pg_temp.attendre_erreur(format('select public.enregistrer_paiement(%L, %L, 34000, null)', (select r ->> 'id' from r1), 'mobile_money'), 'VALIDATION: reference_paiement');
select public.enregistrer_paiement((select (r ->> 'id')::uuid from r1), 'mobile_money', 34000, 'MP2611.1234');
select pg_temp.attendre_erreur(format('select public.enregistrer_paiement(%L, %L, 34000, null)', (select r ->> 'id' from r1), 'especes'), 'TRANSITION_IMPOSSIBLE');
reset role;
do $$ begin
  assert (select statut || '/' || statut_paiement from public.commandes where id = (select (r ->> 'id')::uuid from r1)) = 'livree/paye', 'livrée et payée';
  assert (select encaisse_par from public.commandes where id = (select (r ->> 'id')::uuid from r1)) = '00000000-0000-0000-0000-0000000000a2', 'encaissement attribué';
  assert (select count(*) from public.mouvements_stock where reference_id = (select (r ->> 'id')::uuid from r1) and type = 'livraison') = 2, 'livraison tracée au journal de stock';
  assert (select count(*) from public.commande_historique where commande_id = (select (r ->> 'id')::uuid from r1)) = 5, 'historique complet';
end $$;

-- 9. Annulation : stock libéré, motif obligatoire, livraison en échec.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.attendre_erreur(format('select public.annuler_commande(%L, %L)', (select r ->> 'id' from r3), ''), 'VALIDATION: motif');
select public.annuler_commande((select (r ->> 'id')::uuid from r3), 'La cliente ne répond pas');
select pg_temp.attendre_erreur(format('select public.annuler_commande(%L, %L)', (select r ->> 'id' from r1), 'trop tard'), 'TRANSITION_IMPOSSIBLE');
reset role;
do $$ begin
  assert (select reserve from public.stocks s join t on s.variante_id = t.remover) = 0, 'réservation Remover libérée';
  assert (select statut from public.livraisons where commande_id = (select (r ->> 'id')::uuid from r3)) = 'echec', 'livraison close';
end $$;

-- 10. Expiration automatique des commandes non confirmées.
update public.commandes set reservation_expire_at = now() - interval '1 minute'
where cle_idempotence in ('test-commande-0008', 'test-commande-0009');
do $$ begin
  assert private.expirer_commandes() = 2, 'deux commandes expirées';
  assert (select reserve from public.stocks s join t on s.variante_id = t.lace_glue) = 1, 'stock des commandes expirées libéré';
  assert (select count(*) from public.commande_historique where evenement = 'expiration') = 2, 'expiration historisée';
end $$;

-- 11. Historique immuable.
select pg_temp.attendre_erreur('delete from public.commande_historique', 'HISTORIQUE_IMMUABLE');

select 'TESTS COMMERCE PASSÉS' as resultat;
rollback;
