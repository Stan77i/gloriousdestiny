-- Glorious Destiny — Phase 11 : analyse et prévisions (architecture, section J et D9).
-- Principe : aucune donnée inventée. Chaque chiffre vient des commandes et des mouvements de
-- stock réels ; chaque prévision indique sa base (jours observés, nombre de ventes) et
-- « données insuffisantes » remplace tout chiffre qui ne serait pas fiable.
--
-- Définitions (heure du salon, Africa/Douala) :
-- • Vente : commande confirmée et non annulée, datée de sa confirmation ; quantités nettes des retours.
-- • Jour disponible : le produit existait (au moins un mouvement de stock avant ou ce jour-là) et
--   avait du stock disponible en fin de journée, ou s'est vendu ce jour-là.
-- • Vitesse (unités/jour, fenêtre de 28 jours) : ventes nettes ÷ jours disponibles de la fenêtre.
-- • Jours avant rupture : disponible actuel ÷ vitesse ; date estimée = aujourd'hui + ce nombre.
-- • Quantité recommandée : max(0, vitesse × (délai d'appro + stock de sécurité) − disponible),
--   arrondie à l'unité supérieure ; seulement si les deux délais sont saisis.
-- • Tendance : vitesse des 30 derniers jours contre les 30 précédents (+20 % / −20 %).
-- • Dormant : aucune vente depuis 60 jours, stock disponible, produit présent depuis 60 jours.
-- • À risque de rupture : épuisé, ou jours avant rupture inférieurs au délai d'appro.
-- • Populaire : au moins 25 % des unités vendues sur la fenêtre de 28 jours.
-- • Données insuffisantes : moins de 14 jours d'historique ou moins de 3 ventes sur 28 jours.

insert into public.parametres (cle, valeur, public) values
  ('analyse_fenetre_jours', to_jsonb(28), false),
  ('analyse_tendance_jours', to_jsonb(30), false),
  ('analyse_seuil_tendance_pct', to_jsonb(20), false),
  ('analyse_dormant_jours', to_jsonb(60), false),
  ('analyse_min_ventes', to_jsonb(3), false),
  ('analyse_min_historique_jours', to_jsonb(14), false),
  ('analyse_part_populaire_pct', to_jsonb(25), false)
on conflict (cle) do nothing;

create or replace function public.analyse_produits()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := private.fuseau_salon();
  v_auj date := (now() at time zone private.fuseau_salon())::date;
  v_fenetre integer := private.parametre_entier('analyse_fenetre_jours', 28);
  v_tendance integer := private.parametre_entier('analyse_tendance_jours', 30);
  v_seuil_tendance integer := private.parametre_entier('analyse_seuil_tendance_pct', 20);
  v_dormant integer := private.parametre_entier('analyse_dormant_jours', 60);
  v_min_ventes integer := private.parametre_entier('analyse_min_ventes', 3);
  v_min_hist integer := private.parametre_entier('analyse_min_historique_jours', 14);
  v_part_pop integer := private.parametre_entier('analyse_part_populaire_pct', 25);
  v_debut date;
  v_resultat jsonb;
begin
  if not private.a_role(array['ventes', 'stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  v_debut := v_auj - greatest(v_fenetre, 2 * v_tendance) + 1;

  with
  articles as (
    select va.id as variante_id, va.libelle, p.id as produit_id, p.nom as produit,
           p.delai_appro_jours, p.stock_securite_jours, p.publie,
           coalesce(s.disponible, 0) as disponible
    from public.variantes va
    join public.produits p on p.id = va.produit_id
    left join public.stocks s on s.variante_id = va.id and s.emplacement_id = private.emplacement_principal()
    where va.actif and p.archive_at is null
  ),
  mvt as (
    select m.variante_id, (m.created_at at time zone v_tz)::date as jour,
           sum(m.delta_physique - m.delta_reserve) as delta
    from public.mouvements_stock m
    where m.emplacement_id = private.emplacement_principal()
    group by 1, 2
  ),
  premier as (select variante_id, min(jour) as premier_jour from mvt group by 1),
  ventes as (
    select cl.variante_id, (o.confirmee_at at time zone v_tz)::date as jour, o.id as commande_id,
           (cl.quantite - cl.quantite_retournee) as quantite
    from public.commandes o
    join public.commande_lignes cl on cl.commande_id = o.id
    where o.confirmee_at is not null and o.statut <> 'annulee'
  ),
  grille as (
    select a.variante_id, d::date as jour,
           (select coalesce(sum(m.delta), 0) from mvt m where m.variante_id = a.variante_id and m.jour <= d::date) as dispo_fin,
           (select coalesce(sum(v.quantite), 0) from ventes v where v.variante_id = a.variante_id and v.jour = d::date) as vendu,
           pr.premier_jour
    from articles a
    left join premier pr on pr.variante_id = a.variante_id
    cross join generate_series(v_debut, v_auj, interval '1 day') d
  ),
  jours as (
    select variante_id, jour, vendu,
           (premier_jour is not null and jour >= premier_jour and (dispo_fin > 0 or vendu > 0)) as dispo
    from grille
  ),
  calcul as (
    select
      a.*,
      pr.premier_jour,
      case when pr.premier_jour is null then 0 else v_auj - pr.premier_jour + 1 end as historique_jours,
      (select max(v.jour) from ventes v where v.variante_id = a.variante_id and v.quantite > 0) as derniere_vente,
      (select coalesce(sum(j.vendu), 0) from jours j where j.variante_id = a.variante_id and j.jour > v_auj - v_fenetre) as ventes_fenetre,
      (select count(*) from jours j where j.variante_id = a.variante_id and j.jour > v_auj - v_fenetre and j.dispo) as jours_dispo_fenetre,
      (select count(distinct v.commande_id) from ventes v where v.variante_id = a.variante_id and v.jour > v_auj - v_fenetre and v.quantite > 0) as nb_ventes_fenetre,
      (select coalesce(sum(j.vendu), 0) from jours j where j.variante_id = a.variante_id and j.jour > v_auj - v_tendance) as ventes_t1,
      (select count(*) from jours j where j.variante_id = a.variante_id and j.jour > v_auj - v_tendance and j.dispo) as jours_t1,
      (select coalesce(sum(j.vendu), 0) from jours j where j.variante_id = a.variante_id and j.jour between v_auj - 2 * v_tendance + 1 and v_auj - v_tendance) as ventes_t0,
      (select count(*) from jours j where j.variante_id = a.variante_id and j.jour between v_auj - 2 * v_tendance + 1 and v_auj - v_tendance and j.dispo) as jours_t0,
      (select count(distinct v.commande_id) from ventes v where v.variante_id = a.variante_id and v.jour between v_auj - 2 * v_tendance + 1 and v_auj - v_tendance and v.quantite > 0) as nb_ventes_t0,
      (
        select rl.cout_unitaire_fcfa
        from public.reception_lignes rl join public.receptions r on r.id = rl.reception_id
        where rl.variante_id = a.variante_id and rl.cout_unitaire_fcfa is not null
        order by r.date_reception desc, r.created_at desc limit 1
      ) as cout_unitaire_fcfa
    from articles a
    left join premier pr on pr.variante_id = a.variante_id
  ),
  total as (select greatest(sum(ventes_fenetre), 0) as unites from calcul),
  prevision as (
    select
      c.*,
      (c.historique_jours >= v_min_hist and c.nb_ventes_fenetre >= v_min_ventes and c.jours_dispo_fenetre > 0) as suffisant,
      case when c.jours_dispo_fenetre > 0 then c.ventes_fenetre::numeric / c.jours_dispo_fenetre end as vitesse_brute,
      case when c.jours_t1 > 0 then c.ventes_t1::numeric / c.jours_t1 end as v_t1,
      case when c.jours_t0 > 0 then c.ventes_t0::numeric / c.jours_t0 end as v_t0
    from calcul c
  ),
  final as (
    select
      p.*,
      case when p.suffisant then round(p.vitesse_brute, 2) end as vitesse,
      case when p.suffisant and p.vitesse_brute > 0 then floor(greatest(p.disponible, 0) / p.vitesse_brute)::integer end as jours_avant_rupture,
      case when p.suffisant and p.nb_ventes_t0 >= v_min_ventes and p.v_t0 > 0
        then round((p.v_t1 - p.v_t0) / p.v_t0 * 100)::integer end as tendance_pct
    from prevision p
  )
  select jsonb_build_object(
    'calcule_at', now(),
    'aujourdhui', v_auj,
    'regles', jsonb_build_object(
      'fenetre_jours', v_fenetre, 'tendance_jours', v_tendance, 'seuil_tendance_pct', v_seuil_tendance,
      'dormant_jours', v_dormant, 'min_ventes', v_min_ventes, 'min_historique_jours', v_min_hist,
      'part_populaire_pct', v_part_pop
    ),
    'produits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variante_id', f.variante_id,
        'produit', f.produit,
        'variante', f.libelle,
        'publie', f.publie,
        'disponible', f.disponible,
        'historique_jours', f.historique_jours,
        'derniere_vente', f.derniere_vente,
        'ventes_fenetre', f.ventes_fenetre,
        'nb_ventes_fenetre', f.nb_ventes_fenetre,
        'jours_dispo_fenetre', f.jours_dispo_fenetre,
        'suffisant', f.suffisant,
        'vitesse', f.vitesse,
        'jours_avant_rupture', f.jours_avant_rupture,
        'date_rupture', case when f.jours_avant_rupture is not null then v_auj + f.jours_avant_rupture end,
        'delai_appro_jours', f.delai_appro_jours,
        'stock_securite_jours', f.stock_securite_jours,
        'quantite_recommandee', case
          when f.suffisant and f.delai_appro_jours is not null and f.stock_securite_jours is not null
          then greatest(0, ceil(f.vitesse_brute * (f.delai_appro_jours + f.stock_securite_jours) - f.disponible))::integer
        end,
        'tendance_pct', f.tendance_pct,
        'cout_unitaire_fcfa', f.cout_unitaire_fcfa,
        'part_pct', case when t.unites > 0 then round(f.ventes_fenetre * 100.0 / t.unites)::integer end,
        'classes', to_jsonb(array_remove(array[
          case when f.disponible <= 0 then 'epuise' end,
          case when f.disponible > 0 and f.jours_avant_rupture is not null and f.delai_appro_jours is not null
                    and f.jours_avant_rupture < f.delai_appro_jours then 'risque_rupture' end,
          case when f.suffisant and t.unites > 0 and f.ventes_fenetre * 100 >= v_part_pop * t.unites then 'populaire' end,
          case when f.tendance_pct > v_seuil_tendance then 'en_croissance' end,
          case when f.tendance_pct < -v_seuil_tendance then 'en_baisse' end,
          case when f.disponible > 0 and f.historique_jours >= v_dormant
                    and (f.derniere_vente is null or f.derniere_vente <= v_auj - v_dormant) then 'dormant' end
        ], null))
      ) order by f.ventes_fenetre desc, f.produit)
      from final f cross join total t
    ), '[]'::jsonb),

    -- Agrégats directs : 12 dernières semaines (lundi) et 12 derniers mois.
    'hebdomadaire', (
      select jsonb_agg(jsonb_build_object('debut', s.debut, 'ca_fcfa', coalesce(x.ca, 0), 'ventes', coalesce(x.n, 0), 'unites', coalesce(x.u, 0)) order by s.debut)
      from (
        select (date_trunc('week', v_auj::timestamp) - make_interval(weeks => k))::date as debut
        from generate_series(0, 11) k
      ) s
      left join (
        select date_trunc('week', (o.confirmee_at at time zone v_tz))::date as debut, count(distinct o.id) as n,
               sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa) as ca,
               sum(cl.quantite - cl.quantite_retournee) as u
        from public.commandes o join public.commande_lignes cl on cl.commande_id = o.id
        where o.confirmee_at is not null and o.statut <> 'annulee'
        group by 1
      ) x on x.debut = s.debut
    ),
    'mensuel', (
      select jsonb_agg(jsonb_build_object('debut', s.debut, 'ca_fcfa', coalesce(x.ca, 0), 'ventes', coalesce(x.n, 0), 'unites', coalesce(x.u, 0)) order by s.debut)
      from (
        select (date_trunc('month', v_auj::timestamp) - make_interval(months => k))::date as debut
        from generate_series(0, 11) k
      ) s
      left join (
        select date_trunc('month', (o.confirmee_at at time zone v_tz))::date as debut, count(distinct o.id) as n,
               sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa) as ca,
               sum(cl.quantite - cl.quantite_retournee) as u
        from public.commandes o join public.commande_lignes cl on cl.commande_id = o.id
        where o.confirmee_at is not null and o.statut <> 'annulee'
        group by 1
      ) x on x.debut = s.debut
    )
  )
  into v_resultat;

  return v_resultat;
end;
$$;

revoke all on function public.analyse_produits() from public, anon;
grant execute on function public.analyse_produits() to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
