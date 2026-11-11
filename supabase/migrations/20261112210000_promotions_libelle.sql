-- Promotions : libellé facultatif choisi par l'administration (« Offre spéciale », « Offre
-- limitée »…), affiché en plus du pourcentage réel. Jamais d'urgence inventée : la date de
-- fin affichée est celle de la promotion.

alter table public.promotions
  add column libelle text check (libelle is null or length(trim(libelle)) between 2 and 40);

-- Nouveau type de retour : on remplace les deux fonctions (prix_effectif les appelle par nom).
drop function public.promotions_en_cours();
drop function private.promotion_active(uuid);

create function private.promotion_active(p_variante_id uuid)
returns table (promotion_id uuid, prix_base integer, prix_promo integer, fin timestamptz, libelle text)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select v.id, v.produit_id, coalesce(v.prix_fcfa, p.prix_fcfa) as prix
    from public.variantes v join public.produits p on p.id = v.produit_id
    where v.id = p_variante_id
  )
  select x.id, b.prix, x.prix_promo, x.fin, x.libelle
  from base b
  cross join lateral (
    select pr.id, pr.fin, pr.libelle,
      case pr.mode
        when 'pourcentage' then round(b.prix * (100 - pr.valeur) / 100.0)::integer
        else pr.valeur
      end as prix_promo
    from public.promotions pr
    where pr.actif and pr.debut <= now() and (pr.fin is null or pr.fin > now())
      and pr.produit_id = b.produit_id and (pr.variante_id is null or pr.variante_id = b.id)
  ) x
  where x.prix_promo < b.prix and x.prix_promo > 0
  order by x.prix_promo, x.fin nulls last
  limit 1;
$$;

create function public.promotions_en_cours()
returns table (variante_id uuid, prix_base integer, prix_promo integer, reduction integer, fin timestamptz, libelle text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, a.prix_base, a.prix_promo,
         round(100.0 * (a.prix_base - a.prix_promo) / a.prix_base)::integer, a.fin, a.libelle
  from public.variantes v
  join public.produits p on p.id = v.produit_id and p.publie and p.archive_at is null
  cross join lateral private.promotion_active(v.id) a
  where v.actif;
$$;
revoke all on function public.promotions_en_cours() from public;
grant execute on function public.promotions_en_cours() to anon, authenticated;

create or replace function public.enregistrer_promotion(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_produit uuid := (p ->> 'produit_id')::uuid;
  v_variante uuid := nullif(p ->> 'variante_id', '')::uuid;
  v_mode text := p ->> 'mode';
  v_valeur integer := (p ->> 'valeur')::integer;
  v_debut timestamptz := coalesce(nullif(p ->> 'debut', '')::timestamptz, now());
  v_fin timestamptz := nullif(p ->> 'fin', '')::timestamptz;
  v_libelle text := nullif(trim(coalesce(p ->> 'libelle', '')), '');
  v_base integer;
begin
  if not private.a_role(array[]::text[]) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if v_mode not in ('pourcentage', 'prix') or v_valeur is null or v_valeur <= 0
     or (v_mode = 'pourcentage' and v_valeur > 90) or (v_fin is not null and v_fin <= v_debut)
     or (v_libelle is not null and length(v_libelle) not between 2 and 40) then
    raise exception 'VALIDATION: promotion' using errcode = '22023';
  end if;
  if v_variante is not null and not exists (
    select 1 from public.variantes where id = v_variante and produit_id = v_produit) then
    raise exception 'VALIDATION: format' using errcode = '22023';
  end if;
  if v_mode = 'prix' then
    select min(coalesce(v.prix_fcfa, pr.prix_fcfa)) into v_base
    from public.variantes v join public.produits pr on pr.id = v.produit_id
    where v.produit_id = v_produit and v.actif and (v_variante is null or v.id = v_variante);
    if v_base is null or v_valeur >= v_base then
      raise exception 'VALIDATION: le prix promotionnel doit être inférieur au prix actuel' using errcode = '22023';
    end if;
  end if;
  if v_id is null then
    insert into public.promotions (produit_id, variante_id, mode, valeur, debut, fin, libelle, created_by)
    values (v_produit, v_variante, v_mode, v_valeur, v_debut, v_fin, v_libelle, (select auth.uid()))
    returning id into v_id;
  else
    update public.promotions
    set variante_id = v_variante, mode = v_mode, valeur = v_valeur, debut = v_debut, fin = v_fin,
        libelle = v_libelle, actif = true
    where id = v_id and produit_id = v_produit;
    if not found then
      raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to authenticated, anon;
