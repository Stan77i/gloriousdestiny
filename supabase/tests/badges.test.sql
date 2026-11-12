-- Tests badges : meilleures ventes calculées sur les vraies ventes, droits de modification.
\set ON_ERROR_STOP 1
begin;

-- Aucune vente : aucun badge « Meilleure vente ».
set local role anon;
do $$ begin
  assert (select count(*) from public.meilleures_ventes()) = 0, 'sans vente, aucune meilleure vente';
end $$;
reset role;

-- Ventes de test (annulées en fin de fichier) : Lace Glue 4 unités confirmées, Wax Stick
-- 2 unités (sous le seuil), Braid Gel 5 unités mais commande annulée.
create sequence pg_temp.n;
create function pg_temp.vendre(p_sku text, p_qte int, p_statut text) returns void language plpgsql as $$
declare v_cmd uuid; v_var public.variantes;
begin
  select * into v_var from public.variantes where sku = p_sku;
  insert into public.commandes (reference, cliente_id, ville_id, devise, statut, sous_total_fcfa, total_fcfa,
    cle_idempotence, confirmee_at, annulee_at, motif_annulation)
  values ('GD-9912-' || lpad(nextval('pg_temp.n')::text, 4, '0'), 'c0000000-0000-0000-0000-0000000000b1',
    (select id from public.villes where nom = 'Douala'), 'XAF', p_statut, 1000 * p_qte,
    1000 * p_qte, 'badges-test-' || currval('pg_temp.n'), now(),
    case when p_statut = 'annulee' then now() end, case when p_statut = 'annulee' then 'test' end)
  returning id into v_cmd;
  insert into public.commande_lignes (commande_id, variante_id, nom_snapshot, prix_unitaire_snapshot_fcfa,
    quantite, total_ligne_fcfa)
  values (v_cmd, v_var.id, 'test', 1000, p_qte, 1000 * p_qte);
end $$;
insert into public.clientes (id, nom, telephone) values ('c0000000-0000-0000-0000-0000000000b1', 'Cliente Test Badges', '+237690009101');
alter table public.commandes disable trigger user;
alter table public.commande_lignes disable trigger user;
select pg_temp.vendre('GD-LG-STD', 4, 'confirmee');
select pg_temp.vendre((select v.sku from public.variantes v join public.produits p on p.id = v.produit_id
  where p.slug = 'wax-stick' limit 1), 2, 'livree');
select pg_temp.vendre((select v.sku from public.variantes v join public.produits p on p.id = v.produit_id
  where p.slug = 'braid-gel' limit 1), 5, 'annulee');
alter table public.commandes enable trigger user;
alter table public.commande_lignes enable trigger user;

set local role anon;
do $$ begin
  assert (select array_agg(x) from public.meilleures_ventes() x)
    = array[(select id from public.produits where slug = 'lace-glue')],
    'seule Lace Glue (4 unités confirmées) est une meilleure vente';
end $$;
reset role;

-- Un produit dépublié ne garde pas le badge.
update public.produits set publie = false where slug = 'lace-glue';
set local role anon;
do $$ begin
  assert (select count(*) from public.meilleures_ventes()) = 0, 'produit dépublié exclu';
end $$;
reset role;

-- Les clientes ne peuvent pas s'attribuer un badge.
set local role anon;
do $$ begin
  update public.produits set coup_de_coeur = true where slug = 'wax-stick';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$ begin
  assert not (select coup_de_coeur from public.produits where slug = 'wax-stick'), 'anon ne modifie pas';
end $$;

select 'TESTS BADGES PASSÉS' as resultat;
rollback;
