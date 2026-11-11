-- Tests carte publique : comptes agrégés réels, états distincts, aucune donnée personnelle,
-- accessible aux visiteuses sans ouvrir les tables.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'ventes-pub@test.local');
insert into public.profiles (id, nom, role) values ('00000000-0000-0000-0000-0000000000c1', 'Ventes', 'ventes');

create function pg_temp.commande(cle text, tel text, ville text) returns uuid language sql as $$
  select (public.creer_commande(jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', 'Cliente Secrète ' || cle, 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = ville), 'quartier', 'Quartier Privé', 'point_de_repere', 'Repère'),
    'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from public.variantes v where v.sku = 'GD-LG-STD'), 'quantite', 1))
  )) ->> 'id')::uuid
$$;
create temp table c as select
  pg_temp.commande('pub-test-01', '+221771234501', 'Dakar') as d1,
  pg_temp.commande('pub-test-02', '+221771234502', 'Dakar') as d2,
  pg_temp.commande('pub-test-03', '+221771234503', 'Dakar') as d3,
  pg_temp.commande('pub-test-04', '+15145550104', 'Montréal') as m1,
  pg_temp.commande('pub-test-05', '+15145550105', 'Montréal') as m2;
grant select on c to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  perform public.confirmer_commande((select d1 from c));
  perform public.expedier_commande((select d1 from c));
  perform public.livrer_commande((select d1 from c));
  perform public.confirmer_commande((select d2 from c));
  perform public.expedier_commande((select d2 from c));
  perform public.annuler_commande((select m2 from c), 'Test');
end $$;
reset role;

set local role anon;
set local request.jwt.claim.sub = '';
create temp table r on commit drop as select public.carte_publique() as k;
do $$
declare
  k jsonb := (select k from r);
  dkr jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Dakar');
  mtl jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Montréal');
  lon jsonb := (select x from jsonb_array_elements(k -> 'villes') x where x ->> 'nom' = 'Londres');
  sn jsonb := (select x from jsonb_array_elements(k -> 'pays') x where x ->> 'code' = 'SN');
  texte text := k::text;
begin
  assert (dkr ->> 'enregistrees')::int = 3 and (dkr ->> 'en_route')::int = 1 and (dkr ->> 'livrees')::int = 1,
    'Dakar : 3 enregistrées, 1 en route, 1 livrée (jamais confondues)';
  assert (mtl ->> 'enregistrees')::int = 1 and (mtl ->> 'livrees')::int = 0, 'Montréal : annulée exclue, rien de livré';
  assert (lon ->> 'enregistrees')::int = 0 and (lon ->> 'livrees')::int = 0, 'Londres : zéro, aucune invention';
  assert (sn ->> 'nom') = 'Sénégal' and (sn ->> 'livrees')::int = 1 and (sn ->> 'villes')::int = 1, 'pays agrégé';
  assert jsonb_array_length(k -> 'pays') = 8, '8 pays desservis';
  assert k -> 'salon' ->> 'ville' = 'Douala', 'salon';
  assert position('Secrète' in texte) = 0 and position('Quartier Privé' in texte) = 0
     and position('+221' in texte) = 0 and position('fcfa' in texte) = 0 and position('reference' in texte) = 0,
    'aucune donnée personnelle ni montant';
end $$;
-- Les tables restent fermées aux visiteuses.
do $$ begin
  assert (select count(*) from public.commandes) = 0, 'commandes invisibles pour anon';
exception when insufficient_privilege then null;
end $$;
reset role;

select 'TESTS CARTE PUBLIQUE PASSÉS' as resultat;
rollback;
