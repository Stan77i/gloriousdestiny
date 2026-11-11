-- Tests carte : activité réelle par pays, ville et quartier ; zéros sans invention ; droits.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b7', 'ventes-carte@test.local'),
  ('00000000-0000-0000-0000-0000000000b8', 'stock-carte@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000b7', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000b8', 'Stock', 'stock');

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

create function pg_temp.commande(cle text, tel text, ville text, quartier text, code text, q int) returns uuid language sql as $$
  select (public.creer_commande(jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', 'Cliente ' || cle, 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = ville), 'quartier', quartier, 'point_de_repere', 'Repère'),
    'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from public.variantes v where v.sku = code), 'quantite', q))
  )) ->> 'id')::uuid
$$;
create temp table c as select
  pg_temp.commande('carte-test-01', '+237690000801', 'Douala', 'Akwa', 'GD-LG-STD', 2) as d1,
  pg_temp.commande('carte-test-02', '+237690000802', 'Douala', 'akwa ', 'GD-BG-STD', 1) as d2,
  pg_temp.commande('carte-test-03', '+237690000803', 'Douala', 'Bonapriso', 'GD-LG-STD', 1) as d3,
  pg_temp.commande('carte-test-04', '+2250700008040', 'Abidjan', 'Cocody', 'GD-WS-STD', 3) as a1;
grant select on c to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b7';
do $$ begin
  perform public.confirmer_commande((select d1 from c));
  perform public.expedier_commande((select d1 from c));
  perform public.livrer_commande((select d1 from c));
  perform public.confirmer_commande((select a1 from c));
  perform public.annuler_commande((select d3 from c), 'Cliente injoignable');
end $$;

create temp table r as select public.carte_activite(
  (now() at time zone 'Africa/Douala')::date - 1, (now() at time zone 'Africa/Douala')::date) as k;
do $$
declare
  k jsonb := (select k from r);
  dla jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Douala');
  abj jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Abidjan');
  gar jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Garoua');
begin
  assert (dla ->> 'latitude')::numeric = 4.0511 and (abj ->> 'longitude')::numeric = -4.0083, 'coordonnées réelles';
  assert (dla ->> 'commandes')::int = 2 and (dla ->> 'annulees')::int = 1, 'Douala : 2 commandes, 1 annulée à part';
  assert (dla ->> 'livrees')::int = 1 and (dla ->> 'a_confirmer')::int = 1, 'répartition Douala';
  assert (dla ->> 'ca_fcfa')::int = 19000, 'CA net Douala (vente confirmée)';
  assert dla -> 'produit_phare' ->> 'nom' = 'Lace Glue', 'produit phare';
  assert dla -> 'quartiers' -> 0 ->> 'quartier' = 'Akwa' and (dla -> 'quartiers' -> 0 ->> 'commandes')::int = 2, 'quartiers regroupés (casse, espaces)';
  assert (abj ->> 'en_cours')::int = 1 and (abj ->> 'ca_fcfa')::int = 15000, 'Abidjan';
  assert (gar ->> 'commandes')::int = 0 and gar -> 'produit_phare' = 'null'::jsonb, 'Garoua : zéro, aucune invention';
  assert (select (x ->> 'commandes')::int from jsonb_array_elements(k -> 'pays') x where x ->> 'code' = 'CM') = 2, 'Cameroun';
  assert (select x ->> 'nom' from jsonb_array_elements(k -> 'pays') x where x ->> 'code' = 'CI') = 'Côte d’Ivoire', 'nom du pays';
  assert k -> 'salon' ->> 'ville' = 'Douala', 'salon à Douala';
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b8';
select pg_temp.attendre_erreur($q$select public.carte_activite(current_date - 7, current_date)$q$, 'ACCES_REFUSE');
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur($q$select public.carte_activite(current_date - 7, current_date)$q$, 'permission denied');
reset role;

select 'TESTS CARTE PASSÉS' as resultat;
rollback;
