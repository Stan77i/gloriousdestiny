-- Tests promotions : calcul serveur, prix facturé = prix affiché, dates, désactivation, droits.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'admin-promo@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'ventes-promo@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000e2', 'Ventes', 'ventes');

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
create temp table p (id uuid);
grant select, insert on p to anon, authenticated;
create function pg_temp.promo(sku text) returns jsonb language sql as $$
  select to_jsonb(x) from public.promotions_en_cours() x
  where x.variante_id = (select id from public.variantes v where v.sku = $1)
$$;
grant execute on function pg_temp.promo(text) to anon, authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';

-- 1. −20 % sur tous les formats de Lace Glue (4 000 / 7 000 / 15 000).
insert into p select public.enregistrer_promotion(jsonb_build_object(
  'produit_id', (select id from public.produits where slug = 'lace-glue'), 'mode', 'pourcentage', 'valeur', 20,
  'fin', (now() + interval '7 days')::text));
do $$ begin
  assert pg_temp.promo('GD-LG-STD') ->> 'prix_promo' = '3200' and pg_temp.promo('GD-LG-STD') ->> 'reduction' = '20', '38 ml : 4000 → 3200, −20 %';
  assert pg_temp.promo('GD-LG-150') ->> 'prix_base' = '15000' and pg_temp.promo('GD-LG-150') ->> 'prix_promo' = '12000', '150 ml';
  assert pg_temp.promo('GD-LMS-STD') is null, 'autre produit : aucune promotion';
end $$;

-- 2. Prix promotionnel sur un seul format ; un prix non inférieur est refusé.
select public.enregistrer_promotion(jsonb_build_object(
  'produit_id', (select id from public.produits where slug = 'wax-stick'),
  'variante_id', (select id from public.variantes where sku = 'GD-WS-GF'), 'mode', 'prix', 'valeur', 1500));
select pg_temp.attendre_erreur(format('select public.enregistrer_promotion(%L)', jsonb_build_object(
  'produit_id', (select id from public.produits where slug = 'wax-stick'), 'mode', 'prix', 'valeur', 1000)), 'inférieur');
select pg_temp.attendre_erreur(format('select public.enregistrer_promotion(%L)', jsonb_build_object(
  'produit_id', (select id from public.produits where slug = 'wax-stick'), 'mode', 'pourcentage', 'valeur', 95)), 'VALIDATION');
do $$ begin
  assert pg_temp.promo('GD-WS-GF') ->> 'prix_promo' = '1500' and pg_temp.promo('GD-WS-GF') ->> 'reduction' = '25', 'grand format 2000 → 1500';
  assert pg_temp.promo('GD-WS-STD') is null, 'petit format non concerné';
end $$;

-- 3. Promotion à venir ou expirée : invisible.
select public.enregistrer_promotion(jsonb_build_object(
  'produit_id', (select id from public.produits where slug = 'braid-gel'), 'mode', 'pourcentage', 'valeur', 10,
  'debut', (now() + interval '2 days')::text));
reset role;
insert into public.promotions (produit_id, mode, valeur, debut, fin)
values ((select id from public.produits where slug = 'hair-curl-mousse'), 'pourcentage', 30, now() - interval '10 days', now() - interval '1 day');
set local role authenticated;
do $$ begin
  assert pg_temp.promo('GD-BG-STD') is null, 'à venir : invisible';
  assert pg_temp.promo('GD-HCM-STD') is null, 'expirée : invisible';
end $$;

-- 4. La commande facture le prix promotionnel (prix affiché = prix payé).
set local role anon;
set local request.jwt.claim.sub = '';
do $$
declare r jsonb := public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'test-promo-cmd',
  'cliente', jsonb_build_object('nom', 'Cliente Promo', 'telephone', '+237690007001'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'), 'quartier', 'Akwa', 'point_de_repere', 'Repère'),
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', 2))));
begin
  assert (r ->> 'total_fcfa')::int = 6400, 'total au prix promotionnel : ' || (r ->> 'total_fcfa');
  -- Visible publiquement (prix affichés), table fermée.
  assert pg_temp.promo('GD-LG-STD') ->> 'prix_promo' = '3200', 'lecture publique';
end $$;
select pg_temp.attendre_erreur('select count(*) from public.promotions', 'permission denied');

-- 5. Désactivation : le badge disparaît aussitôt ; droits.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select pg_temp.attendre_erreur(format('select public.desactiver_promotion(%L)', (select id from p)), 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public.desactiver_promotion((select id from p));
do $$ begin
  assert pg_temp.promo('GD-LG-STD') is null, 'désactivée : plus de promotion';
  assert exists (select 1 from public.audit_logs where entite = 'promotions'), 'journalisée';
end $$;

select 'TESTS PROMOTIONS PASSÉS' as resultat;
rollback;
