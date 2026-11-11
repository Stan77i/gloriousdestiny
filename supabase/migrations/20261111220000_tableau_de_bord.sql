-- Glorious Destiny — Phase 10 : tableau de bord (architecture, section D1).
-- Un seul appel calcule tous les indicateurs d'une période. Chaque définition est écrite ici
-- et reprise dans l'interface (« Comment c'est calculé »), pour que chaque chiffre soit
-- vérifiable par une requête directe.
--
-- Définitions :
-- • Vente : commande confirmée par l'équipe (confirmee_at renseigné) et non annulée ensuite.
--   Elle est datée du jour de sa confirmation, à l'heure du salon (Africa/Douala).
-- • Chiffre d'affaires (CA) net : somme des lignes vendues, moins les articles retournés
--   (quantité retournée × prix unitaire de la commande). Les frais de livraison ne comptent pas :
--   la cliente les règle à l'agence.
-- • Encaissé : montants enregistrés comme payés, datés du jour de l'encaissement.
-- • Panier moyen : CA net ÷ nombre de ventes.
-- • Période précédente : même nombre de jours, juste avant la période choisie.
-- • Nouvelle cliente : sa toute première vente tombe dans la période.
-- • Cliente récurrente : a acheté dans la période et compte au moins 2 ventes au total
--   (jusqu'à la fin de la période).

insert into public.parametres (cle, valeur, public)
values ('alerte_confirmation_heures', to_jsonb(12), false)
on conflict (cle) do nothing;

create or replace function public.tableau_de_bord(p_du date, p_au date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := private.fuseau_salon();
  v_jours integer;
  v_prec_du date;
  v_prec_au date;
  v_aujourdhui date := (now() at time zone private.fuseau_salon())::date;
  v_alerte integer := private.parametre_entier('alerte_confirmation_heures', 12);
  v_resultat jsonb;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_du is null or p_au is null or p_du > p_au or p_au - p_du > 366 then
    raise exception 'VALIDATION: periode' using errcode = '22023';
  end if;
  v_jours := p_au - p_du + 1;
  v_prec_au := p_du - 1;
  v_prec_du := p_du - v_jours;

  with ventes as (
    select
      o.id, o.cliente_id, o.ville_id, o.confirmee_at,
      (o.confirmee_at at time zone v_tz)::date as jour,
      (
        select coalesce(sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa), 0)
        from public.commande_lignes cl where cl.commande_id = o.id
      )::integer as ca
    from public.commandes o
    where o.confirmee_at is not null and o.statut <> 'annulee'
  ),
  periode as (select * from ventes where jour between p_du and p_au),
  precedente as (select * from ventes where jour between v_prec_du and v_prec_au),
  premieres as (select cliente_id, min(jour) as premier_jour from ventes group by cliente_id)
  select jsonb_build_object(
    'du', p_du,
    'au', p_au,
    'precedente', jsonb_build_object('du', v_prec_du, 'au', v_prec_au),

    'ventes', jsonb_build_object(
      'ca_fcfa', (select coalesce(sum(ca), 0) from periode),
      'nombre', (select count(*) from periode),
      'panier_moyen_fcfa', (select case when count(*) > 0 then round(sum(ca)::numeric / count(*))::integer end from periode),
      'ca_precedent_fcfa', (select coalesce(sum(ca), 0) from precedente),
      'nombre_precedent', (select count(*) from precedente),
      'encaisse_fcfa', (
        select coalesce(sum(o.montant_encaisse_fcfa), 0) from public.commandes o
        where o.paye_at is not null and (o.paye_at at time zone v_tz)::date between p_du and p_au
      ),
      'a_encaisser_fcfa', (
        select coalesce(sum(o.total_fcfa), 0) from public.commandes o
        where o.statut in ('confirmee', 'expediee', 'livree') and o.statut_paiement = 'non_paye'
      )
    ),

    'serie', (
      select jsonb_agg(jsonb_build_object(
        'jour', j.jour,
        'ca_fcfa', coalesce((select sum(ca) from periode p where p.jour = j.jour), 0),
        'nombre', (select count(*) from periode p where p.jour = j.jour)
      ) order by j.jour)
      from (select generate_series(p_du, p_au, interval '1 day')::date as jour) j
    ),

    'commandes_par_statut', coalesce((
      select jsonb_object_agg(statut, n) from (
        select o.statut, count(*) as n from public.commandes o
        where (o.created_at at time zone v_tz)::date between p_du and p_au
        group by o.statut
      ) x
    ), '{}'::jsonb),

    'par_ville', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ville', v.nom, 'nombre', coalesce(x.n, 0), 'ca_fcfa', coalesce(x.ca, 0)
      ) order by coalesce(x.ca, 0) desc, v.ordre)
      from public.villes v
      left join (select ville_id, count(*) as n, sum(ca) as ca from periode group by ville_id) x on x.ville_id = v.id
      where v.actif or x.n > 0
    ), '[]'::jsonb),

    -- Tous les articles en vente, même ceux qui ne se sont pas vendus (pour « les moins vendus »).
    'produits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variante_id', va.id,
        'produit', p.nom,
        'variante', va.libelle,
        'quantite', coalesce(x.q, 0),
        'ca_fcfa', coalesce(x.ca, 0)
      ) order by coalesce(x.q, 0) desc, coalesce(x.ca, 0) desc, p.nom)
      from public.variantes va
      join public.produits p on p.id = va.produit_id
      left join (
        select cl.variante_id,
               sum(cl.quantite - cl.quantite_retournee) as q,
               sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa) as ca
        from periode pe join public.commande_lignes cl on cl.commande_id = pe.id
        group by cl.variante_id
      ) x on x.variante_id = va.id
      where (va.actif and p.publie and p.archive_at is null) or x.q is not null
    ), '[]'::jsonb),

    'clientes', jsonb_build_object(
      'actives', (select count(distinct cliente_id) from periode),
      'nouvelles', (select count(*) from premieres where premier_jour between p_du and p_au),
      'recurrentes', (
        select count(*) from (
          select pe.cliente_id from (select distinct cliente_id from periode) pe
          join ventes v on v.cliente_id = pe.cliente_id and v.jour <= p_au
          group by pe.cliente_id having count(*) >= 2
        ) r
      ),
      'meilleures', coalesce((
        select jsonb_agg(x order by x.ca_fcfa desc, x.nom) from (
          select c.id, c.nom, count(*)::integer as nombre, sum(pe.ca)::integer as ca_fcfa
          from periode pe join public.clientes c on c.id = pe.cliente_id
          group by c.id, c.nom
          order by sum(pe.ca) desc, c.nom
          limit 5
        ) x
      ), '[]'::jsonb)
    ),

    -- Alertes : état actuel, indépendant de la période.
    'alertes', jsonb_build_object(
      'seuil_heures', v_alerte,
      'commandes_en_attente', coalesce((
        select jsonb_agg(x order by x.created_at) from (
          select o.id, o.reference, c.nom as cliente, o.created_at, o.reservation_expire_at
          from public.commandes o join public.clientes c on c.id = o.cliente_id
          where o.statut = 'nouvelle' and o.created_at < now() - make_interval(hours => v_alerte)
          order by o.created_at
          limit 20
        ) x
      ), '[]'::jsonb),
      'expirations_proches', (
        select count(*) from public.commandes o
        where o.statut = 'nouvelle' and o.reservation_expire_at between now() and now() + interval '6 hours'
      ),
      'a_expedier', (select count(*) from public.commandes o where o.statut = 'confirmee'),
      'en_cours_de_livraison', (select count(*) from public.commandes o where o.statut = 'expediee')
    ),

    'stock', (
      select jsonb_build_object(
        'epuises', count(*) filter (where coalesce(s.disponible, 0) <= 0),
        'bientot_epuises', count(*) filter (where coalesce(s.disponible, 0) > 0 and s.disponible <= p.seuil_alerte),
        'unites_disponibles', coalesce(sum(greatest(coalesce(s.disponible, 0), 0)), 0),
        'valeur_fcfa', sum(greatest(coalesce(s.disponible, 0), 0) * cout.cout) filter (where cout.cout is not null),
        'articles_sans_cout', count(*) filter (where cout.cout is null)
      )
      from public.variantes va
      join public.produits p on p.id = va.produit_id
      left join public.stocks s on s.variante_id = va.id and s.emplacement_id = private.emplacement_principal()
      left join lateral (
        select rl.cout_unitaire_fcfa as cout
        from public.reception_lignes rl join public.receptions r on r.id = rl.reception_id
        where rl.variante_id = va.id and rl.cout_unitaire_fcfa is not null
        order by r.date_reception desc, r.created_at desc
        limit 1
      ) cout on true
      where va.actif and p.archive_at is null
    ),

    'rendez_vous', jsonb_build_object(
      'aujourdhui', (
        select count(*) from public.rendez_vous r
        where r.statut in ('demande', 'confirme') and (r.debut at time zone v_tz)::date = v_aujourdhui
      ),
      'sept_jours', (
        select count(*) from public.rendez_vous r
        where r.statut in ('demande', 'confirme')
          and (r.debut at time zone v_tz)::date between v_aujourdhui and v_aujourdhui + 6
      ),
      'a_confirmer', (
        select count(*) from public.rendez_vous r where r.statut = 'demande' and r.debut > now()
      ),
      'periode_termines', (
        select count(*) from public.rendez_vous r
        where r.statut = 'termine' and (r.debut at time zone v_tz)::date between p_du and p_au
      ),
      'periode_absentes', (
        select count(*) from public.rendez_vous r
        where r.statut = 'absent' and (r.debut at time zone v_tz)::date between p_du and p_au
      ),
      'periode_ca_fcfa', (
        select coalesce(sum(r.prix_snapshot_fcfa), 0) from public.rendez_vous r
        where r.statut = 'termine' and (r.debut at time zone v_tz)::date between p_du and p_au
      )
    )
  )
  into v_resultat;

  return v_resultat;
end;
$$;

revoke all on function public.tableau_de_bord(date, date) from public, anon;
grant execute on function public.tableau_de_bord(date, date) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
