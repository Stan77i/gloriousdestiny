-- Glorious Destiny — carte publique « Notre présence dans le monde ».
-- Fonction serveur dédiée, ouverte aux visiteuses : elle n'expose que des comptes agrégés par
-- pays et par ville desservie, depuis l'ouverture. Jamais de nom, de téléphone, d'adresse, de
-- quartier, de montant ni de date de commande. Les tables restent protégées par la RLS.
--
-- Trois états distincts, jamais confondus :
-- • enregistrees : commandes reçues et non annulées (une commande n'est pas une livraison) ;
-- • en_route     : commandes remises au transporteur, pas encore livrées (statut expediee) ;
-- • livrees      : commandes effectivement remises à la cliente (statut livree ; les retours
--                  ne sont pas comptés comme des livraisons réussies).

create or replace function public.carte_publique()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with par_ville as (
    select
      v.id, v.nom, v.pays, v.latitude, v.longitude, v.ordre,
      count(o.id) filter (where o.statut <> 'annulee')::integer as enregistrees,
      count(o.id) filter (where o.statut = 'expediee')::integer as en_route,
      count(o.id) filter (where o.statut = 'livree')::integer as livrees
    from public.villes v
    left join public.commandes o on o.ville_id = v.id
    where v.actif
    group by v.id
  ),
  salon as (
    select v.nom, v.pays, v.latitude, v.longitude
    from public.villes v
    where v.nom = split_part(coalesce((select valeur #>> '{}' from public.parametres where cle = 'ville_salon'), 'Douala'), ',', 1)
    limit 1
  )
  select jsonb_build_object(
    'salon', (select jsonb_build_object('ville', s.nom, 'pays', s.pays, 'latitude', s.latitude, 'longitude', s.longitude) from salon s),
    'pays', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code, 'nom', p.nom,
        'villes', x.villes, 'enregistrees', x.enregistrees, 'en_route', x.en_route, 'livrees', x.livrees
      ) order by p.ordre)
      from public.pays p
      join (
        select pays, count(*)::integer as villes, sum(enregistrees)::integer as enregistrees,
               sum(en_route)::integer as en_route, sum(livrees)::integer as livrees
        from par_ville group by pays
      ) x on x.pays = p.code
      where p.actif
    ), '[]'::jsonb),
    'villes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pv.id, 'nom', pv.nom, 'pays', pv.pays,
        'latitude', pv.latitude, 'longitude', pv.longitude,
        'enregistrees', pv.enregistrees, 'en_route', pv.en_route, 'livrees', pv.livrees
      ) order by pv.ordre)
      from par_ville pv
      join public.pays p on p.code = pv.pays and p.actif
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.carte_publique() from public;
grant execute on function public.carte_publique() to anon, authenticated;
