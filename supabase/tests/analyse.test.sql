-- Tests Phase 11 : prévisions recalculées à la main sur un jeu de test.
-- T = aujourd'hui (heure du salon). Trois produits de test :
-- • Rapide : entrée de 20 à T-40, perte de 20 à T-21 (rupture 7 jours), entrée de 10 à T-14.
--   Ventes : 3 × 1 unité avant la fenêtre (T-38, T-35, T-32), 7 × 3 unités dans la fenêtre,
--   1 commande annulée (exclue). Délai d'appro 12 j, stock de sécurité 5 j.
-- • Dormant : entrée de 5 à T-90, aucune vente.
-- • Nouveau : entrée de 10 à T-5, 3 ventes : historique trop court.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'stock@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'logistique@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'Stock', 'stock'),
  ('00000000-0000-0000-0000-0000000000e2', 'Logistique', 'logistique');

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

create temp table t as select (now() at time zone 'Africa/Douala')::date as auj;
grant select on t to authenticated;

-- Midi (heure du salon) il y a n jours.
create function pg_temp.il_y_a(n int) returns timestamptz language sql as $$
  select (((select auj from t) - n) + time '12:00') at time zone 'Africa/Douala'
$$;

insert into public.produits (id, sku, slug, nom, categorie_id, type, prix_fcfa, publie, delai_appro_jours, stock_securite_jours)
select x.id, x.sku, x.slug, x.nom, (select id from public.categories limit 1), 'produit', 1000, true, x.delai, x.secu
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'TST-RAPIDE', 'test-rapide', 'Test Rapide', 12, 5),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'TST-DORMANT', 'test-dormant', 'Test Dormant', null, null),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'TST-NOUVEAU', 'test-nouveau', 'Test Nouveau', 10, 5)
) as x(id, sku, slug, nom, delai, secu);
insert into public.variantes (id, produit_id, sku, libelle) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TST-RAPIDE-STD', 'Format standard'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'TST-DORMANT-STD', 'Format standard'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'TST-NOUVEAU-STD', 'Format standard');

-- Historique de stock (mouvements datés) et soldes actuels cohérents.
insert into public.mouvements_stock (variante_id, emplacement_id, type, delta_physique, delta_reserve, motif, created_at) values
  ('b0000000-0000-0000-0000-000000000001', private.emplacement_principal(), 'entree', 20, 0, null, pg_temp.il_y_a(40)),
  ('b0000000-0000-0000-0000-000000000001', private.emplacement_principal(), 'perte', -20, 0, 'test', pg_temp.il_y_a(21)),
  ('b0000000-0000-0000-0000-000000000001', private.emplacement_principal(), 'entree', 10, 0, null, pg_temp.il_y_a(14)),
  ('b0000000-0000-0000-0000-000000000002', private.emplacement_principal(), 'entree', 5, 0, null, pg_temp.il_y_a(90)),
  ('b0000000-0000-0000-0000-000000000003', private.emplacement_principal(), 'entree', 10, 0, null, pg_temp.il_y_a(5));
insert into public.stocks (variante_id, emplacement_id, physique, reserve) values
  ('b0000000-0000-0000-0000-000000000001', private.emplacement_principal(), 10, 0),
  ('b0000000-0000-0000-0000-000000000002', private.emplacement_principal(), 5, 0),
  ('b0000000-0000-0000-0000-000000000003', private.emplacement_principal(), 7, 0);

insert into public.clientes (id, nom, telephone) values ('c0000000-0000-0000-0000-000000000001', 'Cliente Test', '+237690009001');
create sequence pg_temp.n;
create function pg_temp.vente(v uuid, jours int, q int, statut text default 'livree') returns void language sql as $$
  with o as (
    insert into public.commandes (reference, cliente_id, ville_id, devise, statut, sous_total_fcfa, total_fcfa,
      cle_idempotence, confirmee_at, annulee_at, motif_annulation)
    values ('GD-9911-' || lpad(nextval('pg_temp.n')::text, 4, '0'), 'c0000000-0000-0000-0000-000000000001',
      (select id from public.villes where nom = 'Douala'), 'XAF', statut, 1000 * q, 1000 * q,
      'analyse-test-' || currval('pg_temp.n'), pg_temp.il_y_a(jours),
      case when statut = 'annulee' then now() end, case when statut = 'annulee' then 'test' end)
    returning id
  )
  insert into public.commande_lignes (commande_id, variante_id, nom_snapshot, prix_unitaire_snapshot_fcfa, quantite, total_ligne_fcfa)
  select o.id, v, 'Test', 1000, q, 1000 * q from o
$$;

select pg_temp.vente('b0000000-0000-0000-0000-000000000001', d, 1) from unnest(array[38, 35, 32]) d;
select pg_temp.vente('b0000000-0000-0000-0000-000000000001', d, 3) from unnest(array[26, 24, 22, 12, 8, 4, 1]) d;
select pg_temp.vente('b0000000-0000-0000-0000-000000000001', 5, 5, 'annulee');
select pg_temp.vente('b0000000-0000-0000-0000-000000000003', d, 1) from unnest(array[4, 3, 2]) d;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
create temp table r as select public.analyse_produits() as a;
grant select on r to authenticated;
do $$
declare
  a jsonb := (select a from r);
  rapide jsonb := (select x from jsonb_array_elements(a -> 'produits') x where x ->> 'produit' = 'Test Rapide');
  dormant jsonb := (select x from jsonb_array_elements(a -> 'produits') x where x ->> 'produit' = 'Test Dormant');
  nouveau jsonb := (select x from jsonb_array_elements(a -> 'produits') x where x ->> 'produit' = 'Test Nouveau');
begin
  -- Fenêtre de 28 jours [T-27, T] : disponible T-27..T-22 (6 j) et T-14..T (15 j) ; rupture T-21..T-15 exclue.
  assert (rapide ->> 'jours_dispo_fenetre')::int = 21, 'jours disponibles : ' || (rapide ->> 'jours_dispo_fenetre');
  assert (rapide ->> 'ventes_fenetre')::int = 21, 'ventes nettes (annulée exclue)';
  assert (rapide ->> 'nb_ventes_fenetre')::int = 7, 'nombre de ventes';
  assert (rapide ->> 'suffisant')::boolean, 'données suffisantes';
  assert (rapide ->> 'vitesse')::numeric = 1.00, 'vitesse 21 / 21 = 1 par jour';
  assert (rapide ->> 'jours_avant_rupture')::int = 10, 'rupture dans 10 jours';
  assert (rapide ->> 'date_rupture')::date = (select auj from t) + 10, 'date de rupture';
  assert (rapide ->> 'quantite_recommandee')::int = 7, 'recommandé : 1 × (12 + 5) − 10 = 7';
  -- Tendance : 30 derniers jours = 21 ventes / 23 jours ; 30 précédents [T-59, T-30] = 3 / 11 jours (dès T-40).
  assert (rapide ->> 'tendance_pct')::int = round((21.0 / 23 - 3.0 / 11) / (3.0 / 11) * 100)::int, 'tendance : ' || (rapide ->> 'tendance_pct');
  assert rapide -> 'classes' ? 'en_croissance', 'en croissance';
  assert rapide -> 'classes' ? 'risque_rupture', '10 jours < délai de 12 jours';
  assert rapide -> 'classes' ? 'populaire', 'seul produit vendu : 100 % des unités';
  assert (rapide ->> 'historique_jours')::int = 41, 'historique depuis T-40';

  assert not (dormant ->> 'suffisant')::boolean, 'dormant : pas de ventes';
  assert dormant ->> 'vitesse' is null and dormant ->> 'quantite_recommandee' is null, 'aucune prévision inventée';
  assert dormant -> 'classes' ? 'dormant', 'dormant';

  assert not (nouveau ->> 'suffisant')::boolean, 'nouveau : 6 jours d''historique < 14';
  assert nouveau ->> 'jours_avant_rupture' is null, 'pas de rupture estimée';
  assert not (nouveau -> 'classes' ? 'dormant'), 'un produit récent n''est pas dormant';

  assert jsonb_array_length(a -> 'mensuel') = 12 and jsonb_array_length(a -> 'hebdomadaire') = 12, '12 mois, 12 semaines';
  assert (select sum((x ->> 'unites')::int) from jsonb_array_elements(a -> 'mensuel') x) = 3 + 21 + 3, 'unités des 12 mois';
  assert (select sum((x ->> 'ventes')::int) from jsonb_array_elements(a -> 'hebdomadaire') x) = 3 + 7 + 3, 'ventes des 12 semaines (annulée exclue)';
end $$;

-- Droits : stock et ventes ; pas la logistique ni le public.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select pg_temp.attendre_erreur('select public.analyse_produits()', 'ACCES_REFUSE');
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur('select public.analyse_produits()', 'permission denied');
reset role;

select 'TESTS ANALYSE PASSÉS' as resultat;
rollback;
