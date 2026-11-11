-- Glorious Destiny — historique des réglages d'un article (nom, catégorie, unité de vente,
-- seuil d'alerte, prix, publication), tiré du journal d'audit général (inaltérable).
-- Le journal complet reste réservé aux administrateurs : cette fonction n'en expose que les
-- changements de réglages de l'article demandé, au rôle stock.

create or replace function public.historique_reglages(p_variante_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_produit uuid;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  select produit_id into v_produit from public.variantes where id = p_variante_id;
  if not found then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;

  return coalesce((
    select jsonb_agg(x order by x.le desc, x.ordre)
    from (
      select * from (
        -- Réglages du produit (communs à tous ses formats).
        select a.id, a.created_at as le, pr.nom as auteur, c.ordre, c.champ, c.ancien, c.nouveau
        from public.audit_logs a
        left join public.profiles pr on pr.id = a.auteur_id
        cross join lateral (values
          (1, 'Nom', a.avant ->> 'nom', a.apres ->> 'nom'),
          (2, 'Catégorie',
             (select k.nom from public.categories k where k.id::text = a.avant ->> 'categorie_id'),
             (select k.nom from public.categories k where k.id::text = a.apres ->> 'categorie_id')),
          (3, 'Seuil d''alerte', a.avant ->> 'seuil_alerte', a.apres ->> 'seuil_alerte'),
          (4, 'Prix du produit', (a.avant ->> 'prix_fcfa') || ' FCFA', (a.apres ->> 'prix_fcfa') || ' FCFA'),
          (5, 'Publication',
             case (a.avant ->> 'publie')::boolean when true then 'publié' when false then 'non publié' end,
             case (a.apres ->> 'publie')::boolean when true then 'publié' when false then 'non publié' end)
        ) c(ordre, champ, ancien, nouveau)
        where a.entite = 'produits' and a.entite_id = v_produit::text and a.action = 'update'
          and c.ancien is distinct from c.nouveau
        union all
        -- Réglages du format.
        select a.id, a.created_at, pr.nom, c.ordre, c.champ, c.ancien, c.nouveau
        from public.audit_logs a
        left join public.profiles pr on pr.id = a.auteur_id
        cross join lateral (values
          (6, 'Unité de vente', a.avant ->> 'libelle', a.apres ->> 'libelle'),
          (7, 'Prix du format',
             coalesce((a.avant ->> 'prix_fcfa') || ' FCFA', 'prix du produit'),
             coalesce((a.apres ->> 'prix_fcfa') || ' FCFA', 'prix du produit')),
          (8, 'Format', case when (a.avant ->> 'actif')::boolean then 'actif' else 'retiré' end,
             case when (a.apres ->> 'actif')::boolean then 'actif' else 'retiré' end)
        ) c(ordre, champ, ancien, nouveau)
        where a.entite = 'variantes' and a.entite_id = p_variante_id::text and a.action = 'update'
          and c.ancien is distinct from c.nouveau
        union all
        -- Création du format.
        select a.id, a.created_at, pr.nom, 0, 'Création', null, a.apres ->> 'libelle'
        from public.audit_logs a
        left join public.profiles pr on pr.id = a.auteur_id
        where a.entite = 'variantes' and a.entite_id = p_variante_id::text and a.action = 'insert'
      ) t
      order by le desc, ordre
      limit 60
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.historique_reglages(uuid) from public, anon;
grant execute on function public.historique_reglages(uuid) to authenticated;
