-- Tests Phase 8 : livraison (frais par ville, échec, nouvelle tentative, retour au salon,
-- adresse figée, retards, statistiques par ville et produit, fuseau, droits).
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'ventes@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'logistique@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'stock@test.local'),
  ('00000000-0000-0000-0000-0000000000c4', 'admin@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000c2', 'Logistique', 'logistique'),
  ('00000000-0000-0000-0000-0000000000c3', 'Stock', 'stock'),
  ('00000000-0000-0000-0000-0000000000c4', 'Admin', 'admin');

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

-- Commande d'exemple : n Lace Glue (+ 1 Braid Gel) livrés dans une ville donnée.
create function pg_temp.commande(cle text, tel text, ville text, nb_glue int) returns uuid language sql as $$
  select (public.creer_commande(jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', 'Cliente Test', 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = ville),
      'quartier', 'Bastos', 'point_de_repere', 'Portail bleu'),
    'lignes', jsonb_build_array(
      jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', nb_glue),
      jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-BG-STD'), 'quantite', 1))
  )) ->> 'id')::uuid
$$;

create temp table c as select
  pg_temp.commande('test-livraison-0001', '+237690001001', 'Yaoundé', 2) as yaounde,
  pg_temp.commande('test-livraison-0002', '+237690001002', 'Douala', 3) as douala,
  pg_temp.commande('test-livraison-0003', '+237690001003', 'Yaoundé', 1) as rapatrie,
  pg_temp.commande('test-livraison-0004', '+237690001004', 'Yaoundé', 4) as ancienne,
  pg_temp.commande('test-livraison-0005', '+2250700010050', 'Abidjan', 1) as abidjan;
grant select on c to authenticated;
create temp table stock_avant as
  select physique from public.stocks s join public.variantes v on v.id = s.variante_id where v.sku = 'GD-LG-STD';
grant select on stock_avant to authenticated;

-- 1. Les frais de la ville sont appliqués et figés sur la livraison.
do $$ begin
  assert (select frais_livraison_fcfa from public.commandes where id = (select yaounde from c)) = 2500, 'frais Yaoundé';
  assert (select total_fcfa from public.commandes where id = (select yaounde from c)) = 2 * 9500 + 6000 + 2500, 'total avec frais';
  assert (select frais_fcfa from public.livraisons where commande_id = (select yaounde from c)) = 2500, 'frais figés';
  assert (select frais_livraison_fcfa from public.commandes where id = (select abidjan from c)) = 10000, 'frais Abidjan';
end $$;

-- 2. Expédition : transporteur, suivi, date prévue selon le délai de la ville.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$
declare x uuid;
begin
  foreach x in array array[(select yaounde from c), (select douala from c), (select rapatrie from c), (select ancienne from c)] loop
    perform public.confirmer_commande(x);
  end loop;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
do $$
declare x uuid;
begin
  perform public.expedier_commande((select yaounde from c), 'Agence Touristique', 'TK-4471');
  foreach x in array array[(select douala from c), (select rapatrie from c), (select ancienne from c)] loop
    perform public.expedier_commande(x);
  end loop;
  assert (select transporteur || '/' || numero_suivi from public.livraisons where commande_id = (select yaounde from c)) = 'Agence Touristique/TK-4471', 'transporteur et suivi';
  assert (select prevue_au from public.livraisons where commande_id = (select yaounde from c))
    = (now() at time zone 'Africa/Douala')::date + 2, 'arrivée prévue sous 2 jours à Yaoundé';
end $$;

-- 3. Échec : motif obligatoire pour « autre », livraison impossible tant que rien n'est relancé.
select pg_temp.attendre_erreur(format('select public.signaler_echec_livraison(%L, %L)', (select yaounde from c), 'autre'), 'VALIDATION');
select pg_temp.attendre_erreur(format('select public.signaler_echec_livraison(%L, %L)', (select yaounde from c), 'inconnue'), 'VALIDATION');
select public.signaler_echec_livraison((select yaounde from c), 'injoignable', 'Trois appels sans réponse');
select pg_temp.attendre_erreur(format('select public.livrer_commande(%L)', (select yaounde from c)), 'TRANSITION_IMPOSSIBLE');
select pg_temp.attendre_erreur(format('select public.signaler_echec_livraison(%L, %L)', (select yaounde from c), 'absente'), 'TRANSITION_IMPOSSIBLE');
do $$ begin
  assert (select statut || '/' || cause_echec from public.livraisons where commande_id = (select yaounde from c)) = 'echec/injoignable', 'échec enregistré';
  assert (select motif_echec from public.livraisons where commande_id = (select yaounde from c)) = 'Cliente injoignable : Trois appels sans réponse', 'motif lisible';
  assert (select statut from public.commandes where id = (select yaounde from c)) = 'expediee', 'commande toujours en cours';
  assert (select etape from public.vue_livraisons where commande_id = (select yaounde from c)) = 'echec', 'étape échec en attente de décision';
end $$;

-- 4. Nouvelle tentative avec quartier corrigé : l'ancienne adresse reste intacte.
select pg_temp.attendre_erreur(format('select public.relancer_livraison(%L, %L::jsonb)', (select yaounde from c), '{"telephone":"+2376900"}'), 'VALIDATION');
select public.relancer_livraison((select yaounde from c), '{"quartier":"Mvan","point_de_repere":"Station Total"}'::jsonb);
select public.livrer_commande((select yaounde from c));
do $$ begin
  assert (select quartier from public.livraisons where commande_id = (select yaounde from c) and tentative = 1) = 'Bastos', 'adresse figée de la 1re tentative';
  assert (select quartier || '/' || statut || '/' || transporteur from public.livraisons where commande_id = (select yaounde from c) and tentative = 2) = 'Mvan/livree/Agence Touristique', 'tentative 2 livrée';
  assert (select count(*) from public.vue_livraisons where commande_id = (select yaounde from c) and derniere) = 1, 'une seule tentative courante';
  assert (select etape from public.vue_livraisons where commande_id = (select yaounde from c) and tentative = 1) = 'echec_passe', 'échec passé';
  assert (select count(*) from public.commande_historique where commande_id = (select yaounde from c) and evenement in ('echec_livraison', 'relivraison')) = 2, 'historique logistique';
  assert (select r -> 'livraison' ->> 'tentative' from (select public.suivre_commande(
    (select reference from public.commandes where id = (select yaounde from c)), '+237690001001') r) x) = '2', 'suivi public : tentative courante';
end $$;

-- 5. Retour au salon après échec : stock réintégré par un mouvement « retour ».
select public.signaler_echec_livraison((select rapatrie from c), 'refus');
select pg_temp.attendre_erreur(format('select public.rapatrier_colis(%L, %L)', (select rapatrie from c), ''), 'VALIDATION');
select public.rapatrier_colis((select rapatrie from c), 'Cliente ne souhaite plus le colis');
select pg_temp.attendre_erreur(format('select public.relancer_livraison(%L)', (select rapatrie from c)), 'TRANSITION_IMPOSSIBLE');
do $$ begin
  assert (select statut from public.commandes where id = (select rapatrie from c)) = 'retournee', 'commande retournée';
  assert (select statut from public.livraisons where commande_id = (select rapatrie from c)) = 'retournee', 'colis revenu';
  assert (select echec_at is not null from public.livraisons where commande_id = (select rapatrie from c)), 'échec conservé pour les statistiques';
  assert (select count(*) from public.mouvements_stock where reference_id = (select rapatrie from c) and type = 'retour') = 2, 'deux mouvements de retour';
  assert (select bool_and(quantite_retournee = quantite) from public.commande_lignes where commande_id = (select rapatrie from c)), 'lignes soldées';
end $$;

-- 6. Livraisons à Douala et ancienne livraison à Yaoundé ; retour après livraison synchronisé.
select public.livrer_commande((select douala from c));
select public.livrer_commande((select ancienne from c));
select public.retourner_commande((select douala from c), jsonb_build_array(
  jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', 3),
  jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-BG-STD'), 'quantite', 1)), 'Produits non conformes');
do $$ begin
  assert (select statut from public.livraisons where commande_id = (select douala from c)) = 'retournee', 'livraison close par le retour';
  -- Stock Lace Glue : 2 (Yaoundé) + 4 (ancienne) vendus ; 1 rapatrié et 3 retournés sont revenus.
  assert (select physique from public.stocks s join public.variantes v on v.id = s.variante_id where v.sku = 'GD-LG-STD')
    = (select physique from stock_avant) - 2 - 4, 'stock physique exact';
end $$;

-- 7. Statistiques : « Lace Glue livrées à Yaoundé ce mois-ci ».
reset role;
-- La commande « ancienne » a été livrée le mois dernier.
update public.livraisons set expediee_at = date_trunc('month', now()) - interval '5 days',
  livree_at = date_trunc('month', now()) - interval '4 days'
where commande_id = (select ancienne from c);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
create temp table s as select public.statistiques_livraison(
  date_trunc('month', now() at time zone 'Africa/Douala')::date,
  (date_trunc('month', now() at time zone 'Africa/Douala') + interval '1 month - 1 day')::date) as r;
do $$
declare r jsonb := (select r from s);
begin
  assert (select (x ->> 'quantite_livree')::int from jsonb_array_elements(r -> 'par_produit') x
    where x ->> 'produit' = 'Lace Glue' and x ->> 'ville' = 'Yaoundé') = 2, 'Lace Glue livrées à Yaoundé ce mois-ci : 2';
  assert (select (x ->> 'quantite_livree')::int || '/' || (x ->> 'quantite_retournee')
    from jsonb_array_elements(r -> 'par_produit') x
    where x ->> 'produit' = 'Lace Glue' and x ->> 'ville' = 'Douala') = '3/3', 'Douala : 3 livrées, 3 retournées';
  assert (select (x ->> 'livrees')::int || '/' || (x ->> 'echecs') from jsonb_array_elements(r -> 'par_ville') x
    where x ->> 'ville' = 'Yaoundé') = '1/2', 'Yaoundé : 1 livrée, 2 échecs';
  assert (select sum((x ->> 'nombre')::int) from jsonb_array_elements(r -> 'causes_echec') x) = 2, 'causes d''échec';
end $$;

-- 8. Fuseau : livrée le 31/10 à 23 h 30 UTC = 1er novembre 0 h 30 à Yaoundé.
reset role;
update public.livraisons set expediee_at = '2025-10-31 08:00Z', livree_at = '2025-10-31 23:30Z'
where commande_id = (select ancienne from c);
set local role authenticated;
do $$ begin
  assert (select (x ->> 'quantite_livree')::int from jsonb_array_elements(
    public.statistiques_livraison('2025-11-01', '2025-11-30') -> 'par_produit') x
    where x ->> 'produit' = 'Lace Glue' and x ->> 'ville' = 'Yaoundé') = 4, 'comptée en novembre (heure locale)';
  assert not exists (select 1 from jsonb_array_elements(
    public.statistiques_livraison('2025-10-01', '2025-10-31') -> 'par_produit') x
    where x ->> 'ville' = 'Yaoundé'), 'pas en octobre';
end $$;
select pg_temp.attendre_erreur($q$select public.statistiques_livraison('2026-02-01', '2026-01-01')$q$, 'VALIDATION');

-- 9. Retard : colis en route au-delà de la date prévue.
reset role;
set local role authenticated;
select public.confirmer_commande((select abidjan from c));
select public.expedier_commande((select abidjan from c));
do $$ begin
  assert (select etape from public.vue_livraisons where commande_id = (select abidjan from c)) = 'en_route', 'en route';
end $$;
reset role;
update public.livraisons set prevue_au = current_date - 3 where commande_id = (select abidjan from c);
set local role authenticated;
do $$ begin
  assert (select etape from public.vue_livraisons where commande_id = (select abidjan from c)) = 'en_retard', 'en retard';
end $$;

-- 10. Ajustement des frais : tracé, refusé après paiement.
select pg_temp.attendre_erreur(format('select public.ajuster_frais_livraison(%L, 5000, %L)', (select abidjan from c), ''), 'VALIDATION');
select public.ajuster_frais_livraison((select abidjan from c), 7000, 'Remise accordée sur WhatsApp');
do $$ begin
  assert (select total_fcfa - sous_total_fcfa from public.commandes where id = (select abidjan from c)) = 7000, 'total recalculé';
  assert (select frais_fcfa from public.livraisons where commande_id = (select abidjan from c)) = 7000, 'frais de la tentative';
  assert (select motif from public.commande_historique where commande_id = (select abidjan from c) and evenement = 'frais_livraison')
    = '10 000 FCFA → 7 000 FCFA : Remise accordée sur WhatsApp', 'historique des frais';
end $$;
select public.enregistrer_paiement((select abidjan from c), 'especes', 9000);
select pg_temp.attendre_erreur(format('select public.ajuster_frais_livraison(%L, 0, %L)', (select abidjan from c), 'trop tard'), 'TRANSITION_IMPOSSIBLE');

-- 11. Droits.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.attendre_erreur($q$select public.statistiques_livraison('2026-01-01', '2026-01-31')$q$, 'ACCES_REFUSE');
select pg_temp.attendre_erreur(format('select public.signaler_echec_livraison(%L, %L)', (select abidjan from c), 'absente'), 'ACCES_REFUSE');
do $$ begin
  assert (select count(*) from public.vue_livraisons) = 0, 'le rôle stock ne voit pas les livraisons';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.attendre_erreur($q$select public.regler_livraison_ville((select id from public.villes where nom = 'Douala'), 2000, 0, 1, 'livreur')$q$, 'ACCES_REFUSE');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c4';
select pg_temp.attendre_erreur($q$select public.regler_livraison_ville((select id from public.villes where nom = 'Douala'), 2000, 3, 1, 'livreur')$q$, 'VALIDATION');
select public.regler_livraison_ville((select id from public.villes where nom = 'Douala'), 2000, 0, 1, 'livreur', 'Livreur maison');
do $$ begin
  assert (select frais_livraison_fcfa || '/' || tarif_exemple from public.villes where nom = 'Douala') = '2000/false', 'tarif réel enregistré';
  assert (select frais_livraison_fcfa from public.commandes where id = (select douala from c)) = 1500, 'les anciennes commandes gardent leurs frais';
end $$;
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur($q$select public.statistiques_livraison('2026-01-01', '2026-01-31')$q$, 'permission denied');
do $$ begin
  assert (select count(*) from public.villes where frais_livraison_fcfa > 0) = 4, 'tarifs publics lisibles';
end $$;
reset role;

select 'TESTS LIVRAISON PASSÉS' as resultat;
rollback;
