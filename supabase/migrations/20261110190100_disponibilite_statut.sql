-- Disponibilité publique en trois états, sans révéler les quantités :
-- 'disponible', 'bientot_epuise' (disponible ≤ seuil d'alerte du produit), 'epuise'.
drop function if exists public.disponibilite_variantes(uuid[]);

create function public.disponibilite_variantes(p_variante_ids uuid[])
returns table (variante_id uuid, statut text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,
    case
      when coalesce(sum(s.disponible), 0) <= 0 then 'epuise'
      when coalesce(sum(s.disponible), 0) <= p.seuil_alerte then 'bientot_epuise'
      else 'disponible'
    end
  from public.variantes v
  join public.produits p on p.id = v.produit_id and p.publie and p.archive_at is null
  left join public.stocks s on s.variante_id = v.id
  where v.id = any (p_variante_ids) and v.actif
  group by v.id, p.seuil_alerte;
$$;
revoke all on function public.disponibilite_variantes(uuid[]) from public;
grant execute on function public.disponibilite_variantes(uuid[]) to anon, authenticated;
