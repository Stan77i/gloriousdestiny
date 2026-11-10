-- Glorious Destiny — noyau du stock (section G).
-- Règle absolue : aucune quantité ne change sans mouvement. Seule la fonction
-- private.appliquer_mouvement_stock écrit dans public.stocks, et elle écrit le
-- mouvement dans la même transaction. Les contraintes de public.stocks
-- (physique >= 0, reserve >= 0, reserve <= physique) sont la dernière barrière.

create or replace function private.emplacement_principal()
returns smallint
language sql
stable
set search_path = ''
as $$
  select id from public.emplacements where code = 'principal';
$$;

create or replace function private.appliquer_mouvement_stock(
  p_variante_id uuid,
  p_type text,
  p_delta_physique integer,
  p_delta_reserve integer,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_motif text default null,
  p_cle_idempotence text default null,
  p_emplacement_id smallint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emplacement smallint := coalesce(p_emplacement_id, private.emplacement_principal());
  v_existant bigint;
  v_id bigint;
begin
  if v_emplacement is null then
    raise exception 'EMPLACEMENT_INCONNU' using errcode = 'P0001';
  end if;

  -- Idempotence : un même appel rejoué ne produit pas deux mouvements.
  if p_cle_idempotence is not null then
    select id into v_existant from public.mouvements_stock where cle_idempotence = p_cle_idempotence;
    if found then
      return v_existant;
    end if;
  end if;

  insert into public.stocks (variante_id, emplacement_id)
  values (p_variante_id, v_emplacement)
  on conflict do nothing;

  -- Verrou de la ligne : les mouvements concurrents sur la même variante s'exécutent l'un après l'autre.
  perform 1 from public.stocks
  where variante_id = p_variante_id and emplacement_id = v_emplacement
  for update;

  begin
    update public.stocks
    set physique = physique + p_delta_physique,
        reserve = reserve + p_delta_reserve
    where variante_id = p_variante_id and emplacement_id = v_emplacement;
  exception when check_violation then
    raise exception 'STOCK_INSUFFISANT: variante %', p_variante_id using errcode = 'P0001';
  end;

  insert into public.mouvements_stock (
    variante_id, emplacement_id, type, delta_physique, delta_reserve,
    reference_type, reference_id, motif, auteur_id, cle_idempotence
  )
  values (
    p_variante_id, v_emplacement, p_type, p_delta_physique, p_delta_reserve,
    p_reference_type, p_reference_id, nullif(trim(p_motif), ''), (select auth.uid()), p_cle_idempotence
  )
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function private.appliquer_mouvement_stock(uuid, text, integer, integer, text, uuid, text, text, smallint) from public;

-- Entrée de stock (réception). Rôles : stock, admin, owner.
create or replace function public.entree_stock(
  p_variante_id uuid,
  p_quantite integer,
  p_cle_idempotence text,
  p_reception_id uuid default null,
  p_motif text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_quantite is null or p_quantite <= 0 then
    raise exception 'QUANTITE_INVALIDE' using errcode = '22023';
  end if;
  if not exists (select 1 from public.variantes where id = p_variante_id) then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;
  return private.appliquer_mouvement_stock(
    p_variante_id, 'entree', p_quantite, 0,
    case when p_reception_id is null then 'manuel' else 'reception' end,
    p_reception_id, p_motif, p_cle_idempotence
  );
end;
$$;
revoke all on function public.entree_stock(uuid, integer, text, uuid, text) from public, anon;
grant execute on function public.entree_stock(uuid, integer, text, uuid, text) to authenticated;

-- Disponibilité publique : oui/non par variante, sans révéler les quantités.
create or replace function public.disponibilite_variantes(p_variante_ids uuid[])
returns table (variante_id uuid, disponible boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, coalesce(sum(s.disponible), 0) > 0
  from public.variantes v
  join public.produits p on p.id = v.produit_id and p.publie and p.archive_at is null
  left join public.stocks s on s.variante_id = v.id
  where v.id = any (p_variante_ids) and v.actif
  group by v.id;
$$;
revoke all on function public.disponibilite_variantes(uuid[]) from public;
grant execute on function public.disponibilite_variantes(uuid[]) to anon, authenticated;

-- Référence lisible de commande : GD-AAMM-NNNN (heure du Cameroun).
create or replace function private.generer_reference_commande()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'GD-' || to_char(now() at time zone 'Africa/Douala', 'YYMM') || '-'
         || lpad(nextval('public.commandes_reference_seq')::text, 4, '0');
$$;
