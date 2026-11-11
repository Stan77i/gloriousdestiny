-- Tests pays desservis : téléphones par pays, commandes hors zone CFA en FCFA, cohérence ville / pays.
\set ON_ERROR_STOP 1
begin;
\ir prix_reference.inc.sql

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

do $$ begin
  assert (select count(*) from public.pays) = 8, '8 pays';
  assert (select count(*) from public.villes where actif) = 10, '10 villes';
  assert private.telephone_valide('+237690000001'), 'Cameroun 9 chiffres';
  assert not private.telephone_valide('+23769000000'), 'Cameroun 8 chiffres refusé';
  assert private.telephone_valide('+447700900123'), 'Royaume-Uni mobile';
  assert private.telephone_valide('+15145551234'), 'Canada';
  assert private.telephone_valide('+24166123456') and private.telephone_valide('+241066123456'), 'Gabon 8 ou 9 chiffres';
  assert private.telephone_valide('+242061234567') and private.telephone_valide('+221771234567') and private.telephone_valide('+224621234567'), 'Congo, Sénégal, Guinée';
  assert not private.telephone_valide('+33612345678'), 'pays non desservi refusé';
  assert not private.telephone_valide('+447700900123', '+237'), 'mauvais pays pour la ville';
end $$;

create function pg_temp.commande(cle text, ville text, tel text) returns jsonb language sql as $$
  select public.creer_commande(jsonb_build_object(
    'cle_idempotence', cle,
    'cliente', jsonb_build_object('nom', 'Cliente ' || ville, 'telephone', tel),
    'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = ville), 'quartier', 'Centre', 'point_de_repere', 'Gare'),
    'lignes', jsonb_build_array(jsonb_build_object('variante_id', (select id from public.variantes where sku = 'GD-LG-STD'), 'quantite', 1))))
$$;
grant execute on function pg_temp.commande(text, text, text) to anon;

set local role anon;
set local request.jwt.claim.sub = '';
do $$
declare r jsonb;
begin
  r := pg_temp.commande('pays-test-londres', 'Londres', '+447700900123');
  assert r ->> 'devise' = 'XAF', 'Londres : commande en FCFA';
  assert (r ->> 'total_fcfa')::int = 9500, 'prix serveur';
  r := pg_temp.commande('pays-test-dakar', 'Dakar', '+221771234567');
  assert r ->> 'devise' = 'XOF', 'Dakar : FCFA (XOF)';
end $$;
select pg_temp.attendre_erreur($q$select pg_temp.commande('pays-test-mauvais', 'Montréal', '+237690000001')$q$, 'VALIDATION: telephone');
select pg_temp.attendre_erreur(format('select public.demander_alerte_retour_stock(%L, %L, %L, true)',
  (select id from public.variantes where sku = 'GD-LG-STD'), 'Awa', '+33612345678'), 'VALIDATION: telephone');
reset role;

select pg_temp.attendre_erreur($q$insert into public.villes (nom, pays, indicatif, devise, fuseau) values ('Kribi', 'CM', '+225', 'XAF', 'Africa/Douala')$q$, 'indicatif de la ville');

select 'TESTS PAYS PASSÉS' as resultat;
rollback;
