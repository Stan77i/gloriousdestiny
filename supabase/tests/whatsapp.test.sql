-- Tests Phase 6 : message WhatsApp construit par le serveur, ouverture tracée.
\set ON_ERROR_STOP 1
begin;
\ir prix_reference.inc.sql

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'ventes@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'stock@test.local');
insert into public.profiles (id, nom, role) values ('00000000-0000-0000-0000-0000000000b1', 'Ventes', 'ventes'),
  ('00000000-0000-0000-0000-0000000000b2', 'Stock', 'stock');

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

set local role anon;
create temp table r as select public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'test-whatsapp-0001',
  'cliente', jsonb_build_object('nom', 'Awa Ngono', 'telephone', '+237690000555'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'),
    'quartier', 'Bonapriso', 'adresse', 'Rue 1.234', 'point_de_repere', 'Face pharmacie'),
  'lignes', jsonb_build_array(
    jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', 2),
    jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-BG-STD'), 'quantite', 1))
)) as c;
reset role;
grant select on r to anon, authenticated;

do $$
declare m text := (select c ->> 'message_whatsapp' from r);
begin
  assert m like 'Bonjour Glorious Destiny,%', 'formule d''ouverture';
  assert position((select c ->> 'reference' from r) in m) > 0, 'référence dans le message';
  assert position('• Lace Glue × 2 : 19 000 FCFA' in m) > 0, 'ligne Lace Glue : ' || m;
  assert position('• Braid Gel · 250 g × 1 : 6 000 FCFA' in m) > 0, 'ligne Braid Gel : ' || m;
  assert position('Total : 25 000 FCFA (paiement à la livraison)' in m) > 0, 'total formaté';
  assert position('Livraison : Rue 1.234, Bonapriso, Douala' in m) > 0, 'adresse complète';
  assert position('Repère : Face pharmacie' in m) > 0, 'point de repère';
  assert position('Téléphone : +237690000555' in m) > 0, 'téléphone';
  assert (select message_whatsapp_genere_at is not null from public.commandes where id = (select (c ->> 'id')::uuid from r)), 'génération horodatée';
end $$;

-- Ouverture : seulement avec le bon téléphone, horodatée une seule fois.
set local role anon;
do $$ begin
  assert public.signaler_ouverture_whatsapp((select c ->> 'reference' from r), '+237690000999') = false, 'mauvais téléphone';
  assert public.signaler_ouverture_whatsapp(lower((select c ->> 'reference' from r)), '+237690000555') = true, 'bon téléphone';
end $$;
reset role;
create temp table premiere as select message_whatsapp_ouvert_at as t from public.commandes where id = (select (c ->> 'id')::uuid from r);
select pg_sleep(0.01);
set local role anon;
select public.signaler_ouverture_whatsapp((select c ->> 'reference' from r), '+237690000555');
reset role;
do $$ begin
  assert (select t from premiere) is not null, 'ouverture horodatée';
  assert (select message_whatsapp_ouvert_at from public.commandes where id = (select (c ->> 'id')::uuid from r)) = (select t from premiere), 'première ouverture conservée';
end $$;

-- L'équipe relit le message ; le rôle stock et les visiteuses non.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert public.message_whatsapp_commande((select (c ->> 'id')::uuid from r)) = (select c ->> 'message_whatsapp' from r), 'message identique pour l''équipe';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.attendre_erreur(format('select public.message_whatsapp_commande(%L)', (select c ->> 'id' from r)), 'ACCES_REFUSE');
set local role anon;
select pg_temp.attendre_erreur(format('select public.message_whatsapp_commande(%L)', (select c ->> 'id' from r)), 'permission denied');
reset role;

select 'TESTS WHATSAPP PASSÉS' as resultat;
rollback;
