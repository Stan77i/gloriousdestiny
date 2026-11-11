-- Tests des règles de base (stock, sécurité, rendez-vous). Exécuté par scripts/test-db.sh.
\set ON_ERROR_STOP 1
begin;
\ir prix_reference.inc.sql

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'stock@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'ventes@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'cliente@test.local');
insert into public.profiles (id, nom, role) values
  ('00000000-0000-0000-0000-000000000001', 'Owner test', 'owner'),
  ('00000000-0000-0000-0000-000000000002', 'Stock test', 'stock'),
  ('00000000-0000-0000-0000-000000000003', 'Ventes test', 'ventes');

-- Données de test (annulées en fin de fichier par ROLLBACK).
insert into public.categories (id, slug, nom, type, publiee) values
  ('10000000-0000-0000-0000-000000000001', 'test-cat', 'Catégorie test', 'produit', true);
insert into public.produits (id, sku, slug, nom, categorie_id, type, prix_fcfa, publie) values
  ('20000000-0000-0000-0000-000000000001', 'TEST-PUB', 'test-publie', 'Produit test publié', '10000000-0000-0000-0000-000000000001', 'produit', 1000, true),
  ('20000000-0000-0000-0000-000000000002', 'TEST-BROU', 'test-brouillon', 'Produit test brouillon', '10000000-0000-0000-0000-000000000001', 'produit', 1000, false);
insert into public.variantes (id, produit_id, sku, libelle) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'TEST-PUB-1', 'Unique'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'TEST-BROU-1', 'Unique');

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

-- 1. Entrée de stock par le rôle stock.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.entree_stock('30000000-0000-0000-0000-000000000001', 10, 'test-entree-0001');
-- 2. Idempotence : même clé, pas de second mouvement.
select public.entree_stock('30000000-0000-0000-0000-000000000001', 10, 'test-entree-0001');
reset role;
do $$ begin
  assert (select physique from public.stocks where variante_id = '30000000-0000-0000-0000-000000000001') = 10, 'physique attendu 10';
  assert (select count(*) from public.mouvements_stock where variante_id = '30000000-0000-0000-0000-000000000001') = 1, 'un seul mouvement attendu';
end $$;

-- 3. Le rôle ventes ne peut pas faire d''entrée.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select pg_temp.attendre_erreur($q$select public.entree_stock('30000000-0000-0000-0000-000000000001', 5, 'test-entree-0002')$q$, 'ACCES_REFUSE');
-- 4. Aucune modification directe du stock, même par le staff.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.attendre_erreur($q$update public.stocks set physique = 999$q$, 'permission denied');
select pg_temp.attendre_erreur($q$insert into public.mouvements_stock (variante_id, emplacement_id, type, delta_physique, delta_reserve) values ('30000000-0000-0000-0000-000000000001', 1, 'entree', 5, 0)$q$, 'permission denied');
-- 5. La fonction interne n''est pas appelable depuis l''API.
select pg_temp.attendre_erreur($q$select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'entree', 5, 0)$q$, 'permission denied');
reset role;

-- 6. Réservation au-delà du disponible refusée.
select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'reservation', 0, 8);
select pg_temp.attendre_erreur($q$select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'reservation', 0, 3)$q$, 'STOCK_INSUFFISANT');
-- 7. Une perte ne peut pas entamer le stock réservé (10 physique, 8 réservé : perte de 3 refusée).
select pg_temp.attendre_erreur($q$select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'perte', -3, 0, null, null, 'casse')$q$, 'STOCK_INSUFFISANT');
-- 8. Une perte sans motif est refusée.
select pg_temp.attendre_erreur($q$select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'perte', -1, 0)$q$, 'mouvements_motif_obligatoire');
-- 9. Vente : physique et réservé baissent ensemble.
select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'vente', -8, -8);
do $$ begin
  assert (select physique from public.stocks where variante_id = '30000000-0000-0000-0000-000000000001') = 2, 'physique attendu 2';
  assert (select reserve from public.stocks where variante_id = '30000000-0000-0000-0000-000000000001') = 0, 'réservé attendu 0';
  assert (select disponible from public.stocks where variante_id = '30000000-0000-0000-0000-000000000001') = 2, 'disponible attendu 2';
end $$;
-- 10. Signe incohérent refusé (une entrée négative).
select pg_temp.attendre_erreur($q$select private.appliquer_mouvement_stock('30000000-0000-0000-0000-000000000001', 'entree', -1, 0)$q$, 'mouvements_signes_par_type');
-- 11. Journal immuable.
select pg_temp.attendre_erreur($q$delete from public.mouvements_stock$q$, 'HISTORIQUE_IMMUABLE');
select pg_temp.attendre_erreur($q$update public.mouvements_stock set delta_physique = 1$q$, 'HISTORIQUE_IMMUABLE');
-- 12. Produits non supprimables.
select pg_temp.attendre_erreur($q$delete from public.produits$q$, 'HISTORIQUE_IMMUABLE');

-- 13. Visiteuse : voit le produit publié, pas le brouillon ni le stock.
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.produits where sku like 'TEST-%') = 1, 'anon doit voir 1 produit de test';
  assert (select count(*) from public.variantes where sku like 'TEST-%') = 1, 'anon doit voir 1 variante de test';
end $$;
select pg_temp.attendre_erreur($q$select * from public.stocks$q$, 'permission denied');
select pg_temp.attendre_erreur($q$select * from public.commandes$q$, 'permission denied');
do $$ begin
  assert (select statut from public.disponibilite_variantes(array['30000000-0000-0000-0000-000000000001'::uuid])) = 'bientot_epuise', 'variante au seuil : bientôt épuisée (2 ≤ seuil 5)';
  assert (select count(*) from public.disponibilite_variantes(array['30000000-0000-0000-0000-000000000002'::uuid])) = 0, 'brouillon invisible';
  assert (select count(*) from public.parametres where cle = 'delai_expiration_reservation_heures') = 0, 'paramètre privé invisible';
  assert (select count(*) from public.parametres where cle = 'whatsapp_lien') = 1, 'paramètre public visible';
end $$;
reset role;

-- 14. Cliente connectée : ne voit que ses commandes.
insert into public.clientes (id, auth_user_id, nom, telephone) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Cliente A', '+237690000001'),
  ('40000000-0000-0000-0000-000000000002', null, 'Cliente B', '+237690000002');
insert into public.commandes (reference, cliente_id, ville_id, devise, sous_total_fcfa, total_fcfa, cle_idempotence) values
  (private.generer_reference_commande(), '40000000-0000-0000-0000-000000000001', 1, 'XAF', 1000, 1000, 'test-cmd-0001'),
  (private.generer_reference_commande(), '40000000-0000-0000-0000-000000000002', 1, 'XAF', 2000, 2000, 'test-cmd-0002');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$ begin
  assert (select count(*) from public.commandes) = 1, 'la cliente ne doit voir que sa commande';
  assert (select count(*) from public.clientes) = 1, 'la cliente ne doit voir que sa fiche';
end $$;
reset role;

-- 15. Total incohérent refusé.
select pg_temp.attendre_erreur($q$insert into public.commandes (reference, cliente_id, ville_id, devise, sous_total_fcfa, total_fcfa, cle_idempotence) values ('GD-2611-9999', '40000000-0000-0000-0000-000000000002', 1, 'XAF', 1000, 999, 'test-cmd-0003')$q$, 'commandes_total_coherent');
-- 16. Téléphone invalide refusé ; doublon de téléphone refusé.
select pg_temp.attendre_erreur($q$insert into public.clientes (nom, telephone) values ('X', '0690000003')$q$, 'clientes_telephone_check');
select pg_temp.attendre_erreur($q$insert into public.clientes (nom, telephone) values ('X', '+237690000001')$q$, 'clientes_telephone_actif_uidx');

-- 17. Rendez-vous : chevauchement refusé, sauf si le premier est annulé.
insert into public.services (id, slug, nom, type, duree_minutes, prix_fcfa) values
  ('50000000-0000-0000-0000-000000000001', 'test-service', 'Service test', 'perruque', 60, 0);
insert into public.rendez_vous (id, cliente_id, service_id, debut, fin, occupe_debut, occupe_fin) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   '2030-01-10 09:00+01', '2030-01-10 10:00+01', '2030-01-10 09:00+01', '2030-01-10 10:15+01');
select pg_temp.attendre_erreur($q$insert into public.rendez_vous (cliente_id, service_id, debut, fin, occupe_debut, occupe_fin) values ('40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '2030-01-10 10:00+01', '2030-01-10 11:00+01', '2030-01-10 10:00+01', '2030-01-10 11:00+01')$q$, 'rendez_vous_sans_chevauchement');
update public.rendez_vous set statut = 'annule', motif_annulation = 'test' where id = '60000000-0000-0000-0000-000000000001';
insert into public.rendez_vous (cliente_id, service_id, debut, fin, occupe_debut, occupe_fin) values
  ('40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '2030-01-10 10:00+01', '2030-01-10 11:00+01', '2030-01-10 10:00+01', '2030-01-10 11:00+01');

-- 18. Seul l'owner modifie les rôles.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-000000000003';
reset role;
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-000000000003') = 'ventes', 'escalade de rôle impossible';
  assert (select count(*) from public.audit_logs where entite = 'mouvements_stock') = 0, 'mouvements non audités en double';
  assert (select count(*) from public.audit_logs where entite = 'produits') >= 2, 'produits journalisés';
end $$;

-- 19. Un admin modifie un prix : triggers (updated_at, audit) exécutés malgré les droits retirés.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update public.produits set prix_fcfa = 1500 where id = '20000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select prix_fcfa from public.produits where id = '20000000-0000-0000-0000-000000000001') = 1500, 'prix modifié par admin';
  assert exists (select 1 from public.audit_logs where entite = 'produits' and action = 'update'
    and auteur_id = '00000000-0000-0000-0000-000000000001'), 'modification de prix auditée avec son auteur';
end $$;
-- 20. Le rôle ventes ne peut pas modifier un prix.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
update public.produits set prix_fcfa = 1 where id = '20000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select prix_fcfa from public.produits where id = '20000000-0000-0000-0000-000000000001') = 1500, 'ventes ne modifie pas les prix';
end $$;

-- 21. Les 7 produits d'origine sont toujours là ; chaque stock initial passe par un mouvement.
do $$ begin
  assert (select count(*) from public.produits where slug in ('hair-curl-mousse', 'glue-residue-remover-shampoo',
    'lace-melting-spray', 'lace-glue', 'wax-stick', 'lace-glue-remover-spray', 'braid-gel')) = 7, 'les 7 produits d''origine';
  assert (select count(*) from public.mouvements_stock where cle_idempotence like 'stock-initial-%')
       = (select count(*) from public.variantes v where v.sku like 'GD-%'), 'stock initial par mouvements, un par format';
end $$;

select 'TOUS LES TESTS SQL SONT PASSÉS' as resultat;
rollback;
