-- Tests gestion autonome du stock : création de produit, réception, ajustement, garde-fous,
-- verrou de 5 minutes (côté serveur) et déverrouillage motivé, historique avant/après,
-- site public, alertes, vente et annulation, droits.
\set ON_ERROR_STOP 1
begin;
\ir prix_reference.inc.sql

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'responsable@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'ventes-sa@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'Responsable', 'admin'),
  ('00000000-0000-0000-0000-0000000000d2', 'Ventes', 'ventes');

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
create temp table v (id uuid);
grant select, insert on v to authenticated, anon;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';

-- 1. Ajout d'un produit (nouvelle catégorie) : il apparaît aussitôt dans le stock.
insert into v select public.creer_produit(jsonb_build_object(
  'nom', 'Bonnet en satin', 'nouvelle_categorie', 'Accessoires', 'type_categorie', 'produit',
  'unite', 'Pièce', 'prix_fcfa', 2500, 'seuil_alerte', 5, 'stock_initial', 15, 'publie', true,
  'cle_idempotence', 'test-creation-bonnet'));
do $$ begin
  assert (select physique from public.vue_stock where variante_id = (select id from v)) = 15, 'stock initial 15';
  assert (select categorie from public.vue_stock where variante_id = (select id from v)) = 'Accessoires', 'nouvelle catégorie';
  assert public.creer_produit(jsonb_build_object('nom', 'Bonnet en satin', 'nouvelle_categorie', 'Accessoires',
    'unite', 'Pièce', 'prix_fcfa', 2500, 'cle_idempotence', 'test-creation-bonnet')) = (select id from v), 'rejeu sans doublon';
  assert (select count(*) from public.produits where nom = 'Bonnet en satin') = 1, 'un seul produit';
end $$;

-- 2. Réception de 20 : 15 + 20 = 35, sans recalcul manuel.
select public.receptionner(jsonb_build_object('cle_idempotence', 'test-reception-bonnet',
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from v), 'quantite', 20))));
do $$ begin
  assert (select physique from public.stocks where variante_id = (select id from v)) = 35, '15 + 20 = 35';
  assert (select physique_avant || '>' || physique_apres from public.mouvements_stock
          where variante_id = (select id from v) and type = 'entree' order by id desc limit 1) = '15>35', 'avant / après';
end $$;

-- 3. Ajustement : garde-fous (négatif, confirmation des fortes baisses), puis baisse confirmée.
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, -40, %L, %L)', (select id from v), 'Erreur', 'test-aj-neg'), 'STOCK_NEGATIF');
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, -31, %L, %L)', (select id from v), 'Erreur', 'test-aj-conf'), 'CONFIRMATION_REQUISE');
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, -1, %L, %L)', (select id from v), '', 'test-aj-motif'), 'VALIDATION: motif');
select public.ajuster_stock((select id from v), -31, 'Saisie en double de la réception', 'test-aj-ok', true);
do $$ begin
  assert (select physique from public.stocks where variante_id = (select id from v)) = 4, '35 - 31 = 4';
  assert (select type || ':' || delta_physique || ':' || motif from public.mouvements_stock
          where cle_idempotence = 'test-aj-ok') = 'correction:-31:Saisie en double de la réception', 'correction tracée avec motif';
  assert (select auteur_id from public.mouvements_stock where cle_idempotence = 'test-aj-ok') = '00000000-0000-0000-0000-0000000000d1', 'auteur';
  -- Seuil de 5 atteint : alerte d'équipe, statut « bientôt épuisé », vu immédiatement.
  assert (select statut from public.vue_stock where variante_id = (select id from v)) = 'bientot_epuise', 'stock faible';
  assert exists (select 1 from public.notifications where type = 'stock_bas' and donnees ->> 'variante_id' = (select id from v)::text), 'alerte stock faible';
end $$;
-- Rejeu de la même opération : rien ne change.
select public.ajuster_stock((select id from v), -31, 'Saisie en double de la réception', 'test-aj-ok', true);
do $$ begin
  assert (select physique from public.stocks where variante_id = (select id from v)) = 4, 'rejeu sans double retrait';
end $$;

-- 4. Verrou : fenêtre ouverte juste après l'enregistrement, puis close (simulée côté serveur).
do $$ begin
  assert (select not verrouille and secondes_restantes between 290 and 300 and modifie_par = '00000000-0000-0000-0000-0000000000d1'
          from public.vue_stock where variante_id = (select id from v)), 'modifiable 5 minutes après l''enregistrement';
end $$;
reset role;
update public.verrous_stock set modifiable_jusqu_a = now() - interval '1 second' where variante_id = (select id from v);
set local role authenticated;
do $$ begin
  assert (select verrouille from public.vue_stock where variante_id = (select id from v)), 'verrouillé après 5 minutes';
end $$;
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, 1, %L, %L)', (select id from v), 'Erreur', 'test-aj-verrou'), 'STOCK_VERROUILLE');
select pg_temp.attendre_erreur(format('select public.declarer_perte(%L, 1, %L, %L)', (select id from v), 'Cassé', 'test-perte-verrou'), 'STOCK_VERROUILLE');
select pg_temp.attendre_erreur(format('select public.corriger_inventaire(%L, 3, %L, %L)', (select id from v), 'Comptage', 'test-inv-verrou'), 'STOCK_VERROUILLE');
-- La réception de marchandises n'est jamais bloquée.
select public.receptionner(jsonb_build_object('cle_idempotence', 'test-reception-verrou',
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from v), 'quantite', 2))));
reset role;
update public.verrous_stock set modifiable_jusqu_a = now() - interval '1 second' where variante_id = (select id from v);
set local role authenticated;

-- 5. Déverrouillage avec motif : journalisé, nouvelle fenêtre, la correction passe.
select pg_temp.attendre_erreur(format('select public.deverrouiller_stock(%L, %L)', (select id from v), ''), 'VALIDATION: motif');
select public.deverrouiller_stock((select id from v), 'Comptage du soir : un bonnet de plus');
select public.ajuster_stock((select id from v), 1, 'Comptage du soir', 'test-aj-apres');
do $$ begin
  assert (select physique from public.stocks where variante_id = (select id from v)) = 7, '4 + 2 + 1 = 7';
  assert (select motif from public.deverrouillages_stock where variante_id = (select id from v)) = 'Comptage du soir : un bonnet de plus', 'motif journalisé';
end $$;

-- 6. Modification de l'article : nom, catégorie, unité, seuil ; quantités inchangées.
select public.modifier_article(jsonb_build_object('variante_id', (select id from v), 'nom', 'Bonnet satin noir',
  'categorie_id', (select id from public.categories where slug = 'coiffage'), 'unite', 'Lot de 1', 'seuil_alerte', 3));
do $$ begin
  assert (select produit || '|' || categorie || '|' || libelle || '|' || seuil_alerte || '|' || physique
          from public.vue_stock where variante_id = (select id from v)) = 'Bonnet satin noir|Coiffage|Lot de 1|3|7', 'article modifié';
end $$;

-- 7. Site public : disponibilité vivante.
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  -- 7 en stock, seuil 3 : « disponible » sur le site, sans révéler la quantité.
  assert (select statut from public.disponibilite_variantes(array[(select id from v)])) = 'disponible', 'en vente sur le site';
end $$;

-- 8. Vente et annulation : réservation à la commande, restitution à l'annulation.
create temp table c on commit drop as select (public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'test-cmd-bonnet',
  'cliente', jsonb_build_object('nom', 'Cliente Test', 'telephone', '+237690009001'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'), 'quartier', 'Akwa', 'point_de_repere', 'Repère'),
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from v), 'quantite', 7))
)) ->> 'id')::uuid as id;
-- Plus rien de disponible : une nouvelle commande est refusée.
select pg_temp.attendre_erreur(format($q$select public.creer_commande(jsonb_build_object('cle_idempotence', 'test-cmd-bonnet-2',
  'cliente', jsonb_build_object('nom', 'Autre', 'telephone', '+237690009002'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'), 'quartier', 'Akwa', 'point_de_repere', 'Repère'),
  'lignes', jsonb_build_array(jsonb_build_object('variante_id', %L::uuid, 'quantite', 1))))$q$, (select id from v)), 'STOCK');
reset role;
grant select on c to authenticated;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert (select reserve || '/' || physique || '/' || disponible from public.vue_stock where variante_id = (select id from v)) = '7/7/0', 'réservé, pas encore vendu';
end $$;
-- Une baisse sous les réservations est refusée (en déverrouillant d'abord).
select public.deverrouiller_stock((select id from v), 'Vérification des réservations');
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, -1, %L, %L)', (select id from v), 'Erreur', 'test-aj-res'), 'SOUS_RESERVE');
reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
set local role authenticated;
select public.annuler_commande((select id from c), 'Cliente injoignable');
do $$ begin
  assert (select reserve || '/' || physique from public.vue_stock where variante_id = (select id from v)) = '0/7', 'annulation : réservation restituée';
  assert (select vendus from public.vue_stock where variante_id = (select id from v)) = 0, 'rien de vendu';
end $$;

-- 9. Droits : seule une personne autorisée modifie le stock.
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, 1, %L, %L)', (select id from v), 'Essai', 'test-aj-ventes'), 'ACCES_REFUSE');
select pg_temp.attendre_erreur(format('select public.deverrouiller_stock(%L, %L)', (select id from v), 'Essai'), 'ACCES_REFUSE');
select pg_temp.attendre_erreur($q$select public.creer_produit('{"nom":"X","prix_fcfa":1,"cle_idempotence":"test-x-ventes"}')$q$, 'ACCES_REFUSE');
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.attendre_erreur(format('select public.ajuster_stock(%L, 1, %L, %L)', (select id from v), 'Essai', 'test-aj-anon'), 'permission denied');
select pg_temp.attendre_erreur('select public.tableau_stock()', 'permission denied');
select pg_temp.attendre_erreur('select count(*) from public.verrous_stock', 'permission denied');
reset role;

-- 10. Tableau de bord du stock et immutabilité de l'historique.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$
declare t jsonb := public.tableau_stock();
begin
  assert (t ->> 'articles')::int = (select count(*) from public.vue_stock), 'nombre d''articles';
  assert (t ->> 'physique_total')::int = (select sum(physique) from public.vue_stock), 'quantités physiques';
  assert t -> 'dernieres_entrees' -> 0 ->> 'article' = 'Bonnet satin noir · Lot de 1', 'dernière entrée';
  assert t -> 'dernieres_corrections' -> 0 ->> 'motif' = 'Comptage du soir', 'dernière correction';
end $$;
reset role;
select pg_temp.attendre_erreur('delete from public.mouvements_stock where cle_idempotence = ''test-aj-ok''', 'HISTORIQUE_IMMUABLE');
select pg_temp.attendre_erreur('delete from public.deverrouillages_stock', 'HISTORIQUE_IMMUABLE');

select 'TESTS STOCK AUTONOME PASSÉS' as resultat;
rollback;
