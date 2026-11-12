-- Glorious Destiny — badges des prestations, tous vrais :
-- • Coup de cœur : choix de l'équipe (modifiable dans l'administration) ;
-- • Très demandée : calculée à partir des demandes réelles, jamais saisie à la main.

alter table public.services add column coup_de_coeur boolean not null default false;
comment on column public.services.coup_de_coeur is 'Badge « Coup de cœur » : sélection de l''équipe.';

-- Prestations très demandées : au moins 3 demandes (hors annulées) sur 90 jours, 2 au plus.
-- Seuls les identifiants sont publics, jamais les nombres de demandes.
create or replace function public.prestations_tres_demandees()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.service_id
  from public.demandes_prestations d
  join public.services s on s.id = d.service_id
  where d.statut <> 'annulee'
    and d.created_at > now() - interval '90 days'
    and s.publie and s.archive_at is null
  group by d.service_id
  having count(*) >= 3
  order by count(*) desc, d.service_id
  limit 2;
$$;
revoke all on function public.prestations_tres_demandees() from public;
grant execute on function public.prestations_tres_demandees() to anon, authenticated;

-- Choix de l'équipe au lancement (12/11/2026) : la pose frontale.
update public.services set coup_de_coeur = true where slug = 'pose-frontale';
