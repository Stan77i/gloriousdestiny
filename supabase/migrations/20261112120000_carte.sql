-- Glorious Destiny — carte de l'activité : Monde → Pays → Ville → Quartier.
-- Coordonnées géographiques des villes desservies (faits publics), et une fonction qui calcule
-- l'activité réelle par pays, par ville et par quartier sur une période. Aucun chiffre inventé :
-- une ville sans commande renvoie des zéros, l'interface affiche « pas encore de données ».
--
-- Définitions (identiques au tableau de bord) :
-- • Commandes reçues : créées dans la période (heure du salon), annulées comptées à part.
-- • Chiffre d'affaires net : ventes confirmées dans la période, retours déduits.

alter table public.villes
  add column latitude numeric(8, 5) check (latitude between -90 and 90),
  add column longitude numeric(8, 5) check (longitude between -180 and 180);

update public.villes set latitude = 4.05110, longitude = 9.76790 where nom = 'Douala';
update public.villes set latitude = 3.84800, longitude = 11.50210 where nom = 'Yaoundé';
update public.villes set latitude = 9.30170, longitude = 13.39210 where nom = 'Garoua';
update public.villes set latitude = 5.36000, longitude = -4.00830 where nom = 'Abidjan';

create or replace function public.carte_activite(p_du date, p_au date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := private.fuseau_salon();
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_du is null or p_au is null or p_du > p_au or p_au - p_du > 366 then
    raise exception 'VALIDATION: periode' using errcode = '22023';
  end if;

  return (
    with recues as (
      select o.id, o.ville_id, o.cliente_id, o.statut, o.created_at
      from public.commandes o
      where (o.created_at at time zone v_tz)::date between p_du and p_au
    ),
    ventes as (
      select o.id, o.ville_id, o.cliente_id,
             (select coalesce(sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa), 0)
              from public.commande_lignes cl where cl.commande_id = o.id) as ca
      from public.commandes o
      where o.confirmee_at is not null and o.statut <> 'annulee'
        and (o.confirmee_at at time zone v_tz)::date between p_du and p_au
    ),
    par_ville as (
      select
        v.id, v.nom, v.pays, v.devise, v.latitude, v.longitude, v.ordre,
        (select count(*) from recues r where r.ville_id = v.id and r.statut <> 'annulee') as commandes,
        (select count(*) from recues r where r.ville_id = v.id and r.statut in ('livree', 'retournee')) as livrees,
        (select count(*) from recues r where r.ville_id = v.id and r.statut in ('confirmee', 'expediee')) as en_cours,
        (select count(*) from recues r where r.ville_id = v.id and r.statut = 'nouvelle') as a_confirmer,
        (select count(*) from recues r where r.ville_id = v.id and r.statut = 'annulee') as annulees,
        (select coalesce(sum(ca), 0) from ventes x where x.ville_id = v.id) as ca,
        (select count(*) from ventes x where x.ville_id = v.id) as ventes,
        (select count(distinct cliente_id) from recues r where r.ville_id = v.id and r.statut <> 'annulee') as clientes,
        (select max(r.created_at) from recues r where r.ville_id = v.id) as derniere
      from public.villes v
      where v.actif
    )
    select jsonb_build_object(
      'du', p_du,
      'au', p_au,
      'salon', (
        select jsonb_build_object(
          'ville', v.nom, 'latitude', v.latitude, 'longitude', v.longitude,
          'rendez_vous', (
            select count(*) from public.rendez_vous r
            where r.statut in ('demande', 'confirme', 'termine')
              and (r.debut at time zone v_tz)::date between p_du and p_au
          )
        )
        from public.villes v
        where v.nom = split_part(coalesce((select valeur #>> '{}' from public.parametres where cle = 'ville_salon'), 'Douala'), ',', 1)
        limit 1
      ),
      'pays', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', x.pays,
          'nom', case x.pays when 'CM' then 'Cameroun' when 'CI' then 'Côte d’Ivoire' else x.pays end,
          'commandes', x.commandes, 'ca_fcfa', x.ca, 'villes', x.villes
        ) order by x.ca desc, x.pays)
        from (
          select pays, sum(commandes)::integer as commandes, sum(ca)::integer as ca, count(*)::integer as villes
          from par_ville group by pays
        ) x
      ), '[]'::jsonb),
      'villes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pv.id, 'nom', pv.nom, 'pays', pv.pays, 'devise', pv.devise,
          'latitude', pv.latitude, 'longitude', pv.longitude,
          'commandes', pv.commandes, 'livrees', pv.livrees, 'en_cours', pv.en_cours,
          'a_confirmer', pv.a_confirmer, 'annulees', pv.annulees,
          'ca_fcfa', pv.ca, 'ventes', pv.ventes,
          'panier_moyen_fcfa', case when pv.ventes > 0 then round(pv.ca::numeric / pv.ventes)::integer end,
          'clientes', pv.clientes,
          'derniere_commande_at', pv.derniere,
          'produit_phare', (
            select jsonb_build_object('nom', private.nom_variante(cl.variante_id), 'quantite', sum(cl.quantite - cl.quantite_retournee))
            from ventes x join public.commande_lignes cl on cl.commande_id = x.id
            where x.ville_id = pv.id
            group by cl.variante_id
            order by sum(cl.quantite - cl.quantite_retournee) desc, private.nom_variante(cl.variante_id)
            limit 1
          ),
          'quartiers', coalesce((
            select jsonb_agg(q order by q.commandes desc, q.quartier) from (
              select initcap(lower(trim(l.quartier))) as quartier, count(distinct r.id)::integer as commandes
              from recues r
              join public.livraisons l on l.commande_id = r.id
              where r.ville_id = pv.id and r.statut <> 'annulee'
              group by 1
              order by 2 desc, 1
              limit 5
            ) q
          ), '[]'::jsonb)
        ) order by pv.ordre)
        from par_ville pv
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.carte_activite(date, date) from public, anon;
grant execute on function public.carte_activite(date, date) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
