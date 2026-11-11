-- Tests Phase 10 : chaque chiffre du tableau de bord recalculé à la main sur un jeu de test.
-- Période testée : mars 2025 (31 jours) ; période précédente : 29 janvier – 28 février 2025.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'ventes@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'stock@test.local');
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

create function pg_temp.commande(cle text, nom text, tel text, ville text, lignes jsonb) returns uuid language sql as $$
  select (public.creer_commande(jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', nom, 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = ville),
      'quartier', 'Akwa', 'point_de_repere', 'Carrefour'),
    'lignes', lignes
  )) ->> 'id')::uuid
$$;
create function pg_temp.l(code text, q int) returns jsonb language sql as $$
  select jsonb_build_object('variante_id', (select id from public.variantes v where v.sku = code || '-STD'), 'quantite', q)
$$;

-- Clientes : Awa (2 ventes en mars), Bintou (1 en février, 1 en mars), Chantal (1 en mars),
-- Dora (confirmée puis annulée), Esther (jamais confirmée).
create temp table c as select
  pg_temp.commande('tdb-test-000A', 'Awa', '+237690002001', 'Douala', jsonb_build_array(pg_temp.l('GD-LG', 2))) as a,
  pg_temp.commande('tdb-test-000B', 'Awa', '+237690002001', 'Yaoundé', jsonb_build_array(pg_temp.l('GD-BG', 1))) as b,
  pg_temp.commande('tdb-test-000C', 'Bintou', '+2250700020020', 'Abidjan', jsonb_build_array(pg_temp.l('GD-LG', 1), pg_temp.l('GD-LGRS', 1))) as cc,
  pg_temp.commande('tdb-test-000D', 'Chantal', '+237690002003', 'Douala', jsonb_build_array(pg_temp.l('GD-WS', 1))) as d,
  pg_temp.commande('tdb-test-000E', 'Bintou', '+2250700020020', 'Abidjan', jsonb_build_array(pg_temp.l('GD-LG', 1))) as e,
  pg_temp.commande('tdb-test-000F', 'Dora', '+237690002004', 'Garoua', jsonb_build_array(pg_temp.l('GD-LG', 5))) as f,
  pg_temp.commande('tdb-test-000G', 'Esther', '+237690002005', 'Douala', jsonb_build_array(pg_temp.l('GD-BG', 1))) as g;
grant select on c to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$
declare x uuid;
begin
  foreach x in array array[(select a from c), (select b from c), (select cc from c), (select d from c), (select e from c), (select f from c)] loop
    perform public.confirmer_commande(x);
  end loop;
  perform public.annuler_commande((select f from c), 'Cliente injoignable');
  -- A : livrée puis 1 Lace Glue retourné.
  perform public.expedier_commande((select a from c));
  perform public.livrer_commande((select a from c));
  perform public.enregistrer_paiement((select a from c), 'especes', 19000);
  perform public.retourner_commande((select a from c), jsonb_build_array(
    jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', 1)), 'Flacon abîmé');
end $$;
reset role;

-- Dates de confirmation fixées (UTC). Le salon est à UTC+1.
update public.commandes set confirmee_at = '2025-03-05 09:00Z' where id = (select a from c);
update public.commandes set confirmee_at = '2025-03-20 15:00Z' where id = (select b from c);
update public.commandes set confirmee_at = '2025-03-31 22:30Z' where id = (select cc from c); -- 31/03 23 h 30 au salon
update public.commandes set confirmee_at = '2025-02-28 23:30Z' where id = (select d from c);  -- 01/03 0 h 30 au salon
update public.commandes set confirmee_at = '2025-02-10 12:00Z' where id = (select e from c);
update public.commandes set confirmee_at = '2025-03-10 12:00Z' where id = (select f from c);
update public.commandes set paye_at = '2025-03-06 10:00Z' where id = (select a from c);
update public.commandes set created_at = now() - interval '13 hours' where id = (select g from c);
-- Coût d'achat connu pour le Lace Glue uniquement.
insert into public.receptions (id, date_reception) values ('00000000-0000-0000-0000-00000000d0a1', '2025-01-15');
insert into public.reception_lignes (reception_id, variante_id, quantite, cout_unitaire_fcfa)
values ('00000000-0000-0000-0000-00000000d0a1', (select id from public.variantes where sku = 'GD-LG-STD'), 10, 4000);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
create temp table r as select public.tableau_de_bord('2025-03-01', '2025-03-31') as t;
do $$
declare
  t jsonb := (select t from r);
  v jsonb := t -> 'ventes';
begin
  -- A 19 000 − 9 500 retourné + B 6 000 + C 15 000 + D 5 000 ; F annulée exclue ; G jamais confirmée.
  assert (v ->> 'ca_fcfa')::int = 35500, 'CA net : ' || (v ->> 'ca_fcfa');
  assert (v ->> 'nombre')::int = 4, 'ventes : ' || (v ->> 'nombre');
  assert (v ->> 'panier_moyen_fcfa')::int = 8875, 'panier moyen';
  assert (v ->> 'ca_precedent_fcfa')::int = 9500 and (v ->> 'nombre_precedent')::int = 1, 'période précédente (E)';
  assert t -> 'precedente' ->> 'du' = '2025-01-29', 'début période précédente';
  assert (v ->> 'encaisse_fcfa')::int = 19000, 'encaissé en mars';
  assert (v ->> 'a_encaisser_fcfa')::int = 6000 + 15000 + 5000 + 9500, 'reste à encaisser (commandes confirmées non payées)';

  assert jsonb_array_length(t -> 'serie') = 31, 'un point par jour';
  assert (t -> 'serie' -> 0 ->> 'ca_fcfa')::int = 5000, '1er mars (fuseau du salon) : D';
  assert (t -> 'serie' -> 30 ->> 'ca_fcfa')::int = 15000, '31 mars : C';

  assert (select (x ->> 'ca_fcfa')::int || '/' || (x ->> 'nombre') from jsonb_array_elements(t -> 'par_ville') x where x ->> 'ville' = 'Douala') = '14500/2', 'Douala';
  assert (select (x ->> 'ca_fcfa')::int from jsonb_array_elements(t -> 'par_ville') x where x ->> 'ville' = 'Abidjan') = 15000, 'Abidjan';
  assert (select (x ->> 'nombre')::int from jsonb_array_elements(t -> 'par_ville') x where x ->> 'ville' = 'Garoua') = 0, 'Garoua (annulée exclue)';
  assert t -> 'par_ville' -> 0 ->> 'ville' = 'Abidjan', 'villes triées par CA';

  assert t -> 'produits' -> 0 ->> 'produit' = 'Lace Glue', 'meilleure vente';
  assert (t -> 'produits' -> 0 ->> 'quantite')::int = 2 and (t -> 'produits' -> 0 ->> 'ca_fcfa')::int = 19000, 'Lace Glue net des retours';
  assert jsonb_array_length(t -> 'produits') = 7, 'les 7 produits, vendus ou non';
  assert (select count(*) from jsonb_array_elements(t -> 'produits') x where (x ->> 'quantite')::int = 0) = 3, '3 produits sans vente';

  assert (t -> 'clientes' ->> 'actives')::int = 3, 'clientes actives';
  assert (t -> 'clientes' ->> 'nouvelles')::int = 2, 'nouvelles : Awa et Chantal';
  assert (t -> 'clientes' ->> 'recurrentes')::int = 2, 'récurrentes : Awa et Bintou';
  assert t -> 'clientes' -> 'meilleures' -> 0 ->> 'nom' = 'Awa', 'meilleure cliente : Awa (15 500)';

  assert jsonb_array_length(t -> 'alertes' -> 'commandes_en_attente') = 1, 'G attend depuis plus de 12 h';
  assert t -> 'alertes' -> 'commandes_en_attente' -> 0 ->> 'cliente' = 'Esther', 'cliente en attente';
  assert (t -> 'alertes' ->> 'a_expedier')::int = 4, 'B, C, D, E confirmées à expédier';

  assert (t -> 'stock' ->> 'valeur_fcfa')::int = 4000 * (
    select disponible from public.stocks s join public.variantes va on va.id = s.variante_id where va.sku = 'GD-LG-STD'
  ), 'valeur du stock au dernier coût connu';
  assert (t -> 'stock' ->> 'articles_sans_cout')::int = 6, '6 articles sans coût saisi';
end $$;

select pg_temp.attendre_erreur($q$select public.tableau_de_bord('2025-03-31', '2025-03-01')$q$, 'VALIDATION');
select pg_temp.attendre_erreur($q$select public.tableau_de_bord('2024-01-01', '2025-03-01')$q$, 'VALIDATION');

-- Avril : C (31/03 23 h 30 au salon) n'y est pas.
do $$ begin
  assert (public.tableau_de_bord('2025-04-01', '2025-04-30') -> 'ventes' ->> 'nombre')::int = 0, 'avril vide';
end $$;

-- Droits.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
select pg_temp.attendre_erreur($q$select public.tableau_de_bord('2025-03-01', '2025-03-31')$q$, 'ACCES_REFUSE');
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur($q$select public.tableau_de_bord('2025-03-01', '2025-03-31')$q$, 'permission denied');
reset role;

select 'TESTS TABLEAU DE BORD PASSÉS' as resultat;
rollback;
