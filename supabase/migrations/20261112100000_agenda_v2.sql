-- Glorious Destiny — agenda v2 : blocage manuel de créneaux, report, rappels, horaires tardifs.
-- • Blocages : une plage bloquée (formation, pause, rendez-vous pris par téléphone…) n'est jamais
--   proposée ni réservable. Réservations, reports et blocages prennent le même verrou
--   transactionnel (pg_advisory_xact_lock) : deux opérations simultanées ne peuvent pas se
--   chevaucher. Entre rendez-vous, la contrainte d'exclusion existante reste la garantie.
-- • Report : l'équipe déplace un rendez-vous vers un créneau libre ; l'ancien est libéré.
-- • Rappels : la cliente n'a pas de compte et le site n'envoie pas de WhatsApp automatiquement.
--   Le serveur prépare donc la liste des rappels à envoyer (message rédigé, numéro de la cliente)
--   et trace chaque envoi.
-- • Horaires : rien ne limite la fermeture avant minuit (ouverture possible jusqu'à 23 h 59).

insert into public.parametres (cle, valeur, public) values
  ('rappel_rdv_heures', to_jsonb(24), false)
on conflict (cle) do nothing;

alter table public.rendez_vous add column rappel_envoye_at timestamptz;

alter table public.rendez_vous_historique drop constraint rendez_vous_historique_evenement_check;
alter table public.rendez_vous_historique add constraint rendez_vous_historique_evenement_check
  check (evenement in ('creation', 'confirmation', 'annulation', 'termine', 'absent', 'report', 'rappel'));

-- ---------------------------------------------------------------------------
-- Blocages de l'agenda
-- ---------------------------------------------------------------------------
create table public.blocages_agenda (
  id uuid primary key default gen_random_uuid(),
  debut timestamptz not null,
  fin timestamptz not null,
  motif text not null check (length(trim(motif)) between 3 and 200),
  cree_par uuid references auth.users (id),
  created_at timestamptz not null default now(),
  retire_at timestamptz,
  retire_par uuid references auth.users (id),
  check (fin > debut),
  check (fin - debut <= interval '14 days'),
  constraint blocages_sans_chevauchement exclude using gist (
    tstzrange(debut, fin, '[)') with &&
  ) where (retire_at is null)
);
create index blocages_agenda_debut_idx on public.blocages_agenda (debut) where retire_at is null;
create index blocages_agenda_cree_par_idx on public.blocages_agenda (cree_par);
create index blocages_agenda_retire_par_idx on public.blocages_agenda (retire_par);

alter table public.blocages_agenda enable row level security;
revoke all on public.blocages_agenda from anon, authenticated;
grant select on public.blocages_agenda to authenticated;
create policy blocages_lecture on public.blocages_agenda for select to authenticated
  using ((select private.a_role(array['ventes'])));

create or replace function private.verrou_agenda()
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(771001);
$$;

-- Toute réservation ou tout report qui toucherait une plage bloquée est refusé, quel que soit
-- le chemin d'écriture.
create or replace function private.controler_blocages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut in ('demande', 'confirme') then
    perform private.verrou_agenda();
    if exists (
      select 1 from public.blocages_agenda b
      where b.retire_at is null
        and tstzrange(b.debut, b.fin, '[)') && tstzrange(new.occupe_debut, new.occupe_fin, '[)')
    ) then
      raise exception 'CRENEAU_INDISPONIBLE: plage bloquée' using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;
create trigger rendez_vous_controle_blocages
  before insert or update of debut, fin, occupe_debut, occupe_fin, statut on public.rendez_vous
  for each row execute function private.controler_blocages();

-- ---------------------------------------------------------------------------
-- Créneaux : version complète (rendez-vous à ignorer, délai minimal ajustable, blocages)
-- ---------------------------------------------------------------------------
create or replace function private.creneaux_libres(
  p_service_id uuid, p_du date, p_au date, p_ignorer uuid, p_delai_minutes integer
)
returns table (debut timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select * from public.services where id = p_service_id and archive_at is null
  ),
  cfg as (
    select private.fuseau_salon() as fuseau,
           p_delai_minutes as delai,
           private.parametre_entier('horizon_reservation_jours', 60) as horizon
  ),
  jours as (
    select d::date as jour
    from generate_series(p_du, least(p_au, p_du + 30), interval '1 day') d
  ),
  plages as (
    select j.jour, e.heure_debut, e.heure_fin, 30 as pas
    from jours j join public.exceptions_disponibilite e on e.date = j.jour and not e.ferme
    union all
    select j.jour, d.heure_debut, d.heure_fin, d.pas_minutes
    from jours j
    join public.disponibilites_services d
      on d.actif and d.jour_semaine = extract(dow from j.jour)::smallint
    where not exists (select 1 from public.exceptions_disponibilite e where e.date = j.jour)
  ),
  candidats as (
    select (p.jour + p.heure_debut + make_interval(mins => k * p.pas)) at time zone cfg.fuseau as debut
    from plages p
    cross join s
    cross join cfg
    cross join lateral generate_series(
      0,
      floor((extract(epoch from (p.heure_fin - p.heure_debut)) / 60 - s.duree_minutes) / p.pas)::integer
    ) k
  )
  select distinct c.debut
  from candidats c cross join s cross join cfg
  where c.debut >= now() + make_interval(mins => cfg.delai)
    and (c.debut at time zone cfg.fuseau)::date <= (now() at time zone cfg.fuseau)::date + cfg.horizon
    and not exists (
      select 1 from public.rendez_vous r
      where r.statut in ('demande', 'confirme')
        and r.id is distinct from p_ignorer
        and tstzrange(r.occupe_debut, r.occupe_fin, '[)') && tstzrange(
          c.debut - make_interval(mins => s.tampon_avant_minutes),
          c.debut + make_interval(mins => s.duree_minutes + s.tampon_apres_minutes),
          '[)'
        )
    )
    and not exists (
      select 1 from public.blocages_agenda b
      where b.retire_at is null
        and tstzrange(b.debut, b.fin, '[)') && tstzrange(
          c.debut - make_interval(mins => s.tampon_avant_minutes),
          c.debut + make_interval(mins => s.duree_minutes + s.tampon_apres_minutes),
          '[)'
        )
    )
  order by 1;
$$;

-- Les créneaux publics (réservation en ligne) : prestation publiée, délai minimal du paramètre.
create or replace function private.creneaux(p_service_id uuid, p_du date, p_au date)
returns table (debut timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.debut
  from private.creneaux_libres(
    p_service_id, p_du, p_au, null, private.parametre_entier('delai_min_reservation_minutes', 120)
  ) c
  where exists (select 1 from public.services s where s.id = p_service_id and s.publie);
$$;

-- ---------------------------------------------------------------------------
-- Blocage manuel
-- ---------------------------------------------------------------------------
create or replace function public.bloquer_creneau(p_debut timestamptz, p_fin timestamptz, p_motif text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nb integer;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin <= p_debut or p_fin <= now()
     or p_fin - p_debut > interval '14 days' then
    raise exception 'VALIDATION: plage' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motif, ''))) not between 3 and 200 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  perform private.verrou_agenda();
  select count(*) into v_nb from public.rendez_vous r
  where r.statut in ('demande', 'confirme')
    and tstzrange(r.occupe_debut, r.occupe_fin, '[)') && tstzrange(p_debut, p_fin, '[)');
  if v_nb > 0 then
    raise exception 'RDV_EXISTANTS: %', v_nb using errcode = 'P0001';
  end if;
  begin
    insert into public.blocages_agenda (debut, fin, motif, cree_par)
    values (p_debut, p_fin, trim(p_motif), (select auth.uid()))
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'CRENEAU_INDISPONIBLE: déjà bloqué' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create or replace function public.retirer_blocage(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.blocages_agenda set retire_at = now(), retire_par = (select auth.uid())
  where id = p_id and retire_at is null;
  if not found then
    raise exception 'BLOCAGE_INTROUVABLE' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Report par l'équipe
-- ---------------------------------------------------------------------------
-- Créneaux possibles pour déplacer un rendez-vous un jour donné (sans délai minimal, le
-- rendez-vous lui-même ne bloque pas).
create or replace function public.creneaux_report(p_id uuid, p_jour date)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v public.rendez_vous;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  select * into v from public.rendez_vous where id = p_id;
  if not found then
    raise exception 'RENDEZ_VOUS_INTROUVABLE' using errcode = 'P0002';
  end if;
  return query select c.debut from private.creneaux_libres(v.service_id, p_jour, p_jour, p_id, 0) c;
end;
$$;

create or replace function public.reprogrammer_rendez_vous(p_id uuid, p_debut timestamptz, p_motif text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.rendez_vous := private.rendez_vous_verrouille(p_id);
  v_jour date;
  v_tz text := private.fuseau_salon();
begin
  if v.statut not in ('demande', 'confirme') then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  if p_debut is null or p_debut <= now() or p_debut = v.debut then
    raise exception 'VALIDATION: creneau' using errcode = '22023';
  end if;
  if length(coalesce(p_motif, '')) > 300 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  perform private.verrou_agenda();
  v_jour := (p_debut at time zone v_tz)::date;
  perform 1 from private.creneaux_libres(v.service_id, v_jour, v_jour, p_id, 0) c where c.debut = p_debut;
  if not found then
    raise exception 'CRENEAU_INDISPONIBLE' using errcode = 'P0001';
  end if;
  begin
    -- Même durée et mêmes battements qu'à la réservation.
    update public.rendez_vous
    set debut = p_debut,
        fin = p_debut + (v.fin - v.debut),
        occupe_debut = p_debut - (v.debut - v.occupe_debut),
        occupe_fin = p_debut + (v.occupe_fin - v.debut),
        rappel_envoye_at = null
    where id = p_id;
  exception when exclusion_violation then
    raise exception 'CRENEAU_INDISPONIBLE' using errcode = 'P0001';
  end;
  perform private.journal_rendez_vous(
    p_id, 'report', v.statut, v.statut,
    concat_ws(' : ', private.date_longue(v.debut) || ' → ' || private.date_longue(p_debut), nullif(trim(p_motif), ''))
  );
  return private.resume_rendez_vous(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rappels
-- ---------------------------------------------------------------------------
create or replace function private.message_rappel_rdv(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
    'Bonjour ' || split_part(c.nom, ' ', 1) || ',',
    'petit rappel de Glorious Destiny : votre rendez-vous « ' || coalesce(r.service_nom_snapshot, s.nom)
      || ' » est prévu le ' || private.date_longue(r.debut) || '.',
    case when (select valeur #>> '{}' from public.parametres where cle = 'ville_salon') is not null
      then 'Salon : ' || (select valeur #>> '{}' from public.parametres where cle = 'ville_salon') || '.' end,
    'Un empêchement ? Répondez simplement à ce message.',
    'Référence : ' || r.reference
  )
  from public.rendez_vous r
  join public.clientes c on c.id = r.cliente_id
  join public.services s on s.id = r.service_id
  where r.id = p_id;
$$;

-- Rendez-vous des prochaines heures (paramètre rappel_rdv_heures) dont le rappel n'est pas parti.
create or replace function public.rappels_a_envoyer()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'reference', r.reference,
      'debut', r.debut,
      'statut', r.statut,
      'service', coalesce(r.service_nom_snapshot, s.nom),
      'cliente', c.nom,
      'telephone', c.telephone,
      'message', private.message_rappel_rdv(r.id)
    ) order by r.debut)
    from public.rendez_vous r
    join public.clientes c on c.id = r.cliente_id
    join public.services s on s.id = r.service_id
    where r.statut in ('demande', 'confirme')
      and r.rappel_envoye_at is null
      and r.debut > now()
      and r.debut <= now() + make_interval(hours => private.parametre_entier('rappel_rdv_heures', 24))
  ), '[]'::jsonb);
end;
$$;

create or replace function public.marquer_rappel_envoye(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.rendez_vous := private.rendez_vous_verrouille(p_id);
begin
  if v.statut not in ('demande', 'confirme') then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  if v.rappel_envoye_at is null then
    update public.rendez_vous set rappel_envoye_at = now() where id = p_id;
    perform private.journal_rendez_vous(p_id, 'rappel', v.statut, v.statut, 'Rappel WhatsApp envoyé');
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'bloquer_creneau(timestamptz, timestamptz, text)', 'retirer_blocage(uuid)',
    'creneaux_report(uuid, date)', 'reprogrammer_rendez_vous(uuid, timestamptz, text)',
    'rappels_a_envoyer()', 'marquer_rappel_envoye(uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
