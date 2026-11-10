-- Glorious Destiny — Phase 9 : rendez-vous (architecture, section I).
-- Les créneaux sont calculés par le serveur, dans le fuseau du salon, à partir des horaires
-- hebdomadaires, des exceptions (fermetures, horaires spéciaux) et des rendez-vous actifs.
-- La réservation est atomique : la contrainte d'exclusion de la table rend tout chevauchement
-- impossible, même entre deux réservations simultanées.

-- ---------------------------------------------------------------------------
-- Paramètres
-- ---------------------------------------------------------------------------
insert into public.parametres (cle, valeur, public) values
  ('delai_min_reservation_minutes', to_jsonb(120), true),
  ('horizon_reservation_jours', to_jsonb(60), true),
  ('delai_annulation_heures', to_jsonb(3), true),
  ('max_rendez_vous_en_attente', to_jsonb(2), false)
on conflict (cle) do nothing;

create or replace function private.parametre_entier(p_cle text, p_defaut integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (valeur #>> '{}')::integer from public.parametres where cle = p_cle), p_defaut);
$$;

create or replace function private.fuseau_salon()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select valeur #>> '{}' from public.parametres where cle = 'fuseau_salon'), 'Africa/Douala');
$$;

-- ---------------------------------------------------------------------------
-- Compléments de la table rendez_vous
-- ---------------------------------------------------------------------------
create sequence if not exists public.rendez_vous_reference_seq;

create or replace function private.generer_reference_rendez_vous()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'RDV-' || to_char(now() at time zone 'Africa/Douala', 'YYMM') || '-'
         || lpad(nextval('public.rendez_vous_reference_seq')::text, 4, '0');
$$;

alter table public.rendez_vous
  add column reference text,
  add column cle_idempotence text,
  add column service_nom_snapshot text,
  add column prix_snapshot_fcfa integer check (prix_snapshot_fcfa is null or prix_snapshot_fcfa >= 0),
  add column confirme_at timestamptz,
  add column annule_at timestamptz,
  add column annule_par text check (annule_par is null or annule_par in ('cliente', 'equipe')),
  add column cloture_at timestamptz,
  add column message_whatsapp_ouvert_at timestamptz;

update public.rendez_vous set reference = private.generer_reference_rendez_vous() where reference is null;
alter table public.rendez_vous alter column reference set not null;
alter table public.rendez_vous alter column reference set default private.generer_reference_rendez_vous();
alter table public.rendez_vous add constraint rendez_vous_reference_unique unique (reference);
alter table public.rendez_vous add constraint rendez_vous_cle_unique unique (cle_idempotence);
create index rendez_vous_statut_debut_idx on public.rendez_vous (statut, debut);

-- ---------------------------------------------------------------------------
-- Historique (append-only)
-- ---------------------------------------------------------------------------
create table public.rendez_vous_historique (
  id bigint generated always as identity primary key,
  rendez_vous_id uuid not null references public.rendez_vous (id),
  evenement text not null check (evenement in ('creation', 'confirmation', 'annulation', 'termine', 'absent')),
  statut_avant text,
  statut_apres text not null,
  motif text,
  auteur_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index rendez_vous_historique_rdv_idx on public.rendez_vous_historique (rendez_vous_id, created_at);
create index rendez_vous_historique_auteur_idx on public.rendez_vous_historique (auteur_id);
create trigger rendez_vous_historique_immuable
  before update or delete on public.rendez_vous_historique
  for each row execute function private.interdire_modification();

alter table public.rendez_vous_historique enable row level security;
revoke all on public.rendez_vous_historique from anon, authenticated;
grant select on public.rendez_vous_historique to authenticated;
create policy rendez_vous_historique_lecture on public.rendez_vous_historique for select to authenticated
  using ((select private.a_role(array['ventes'])));

create or replace function private.journal_rendez_vous(
  p_id uuid, p_evenement text, p_avant text, p_apres text, p_motif text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.rendez_vous_historique (rendez_vous_id, evenement, statut_avant, statut_apres, motif, auteur_id)
  values (p_id, p_evenement, p_avant, p_apres, nullif(trim(p_motif), ''), (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Créneaux disponibles
-- ---------------------------------------------------------------------------
-- Pour chaque jour de [p_du, p_au] (31 jours au plus) : les plages d'ouverture du jour
-- (exception du jour si elle existe, sinon horaires hebdomadaires), découpées au pas,
-- où la prestation tient entière avant la fermeture ; puis on retire le passé (avec le
-- délai minimal), l'au-delà de l'horizon, et tout ce qui chevauche un rendez-vous actif
-- (tampons compris).
create or replace function private.creneaux(p_service_id uuid, p_du date, p_au date)
returns table (debut timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select * from public.services where id = p_service_id and publie and archive_at is null
  ),
  cfg as (
    select private.fuseau_salon() as fuseau,
           private.parametre_entier('delai_min_reservation_minutes', 120) as delai,
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
        and tstzrange(r.occupe_debut, r.occupe_fin, '[)') && tstzrange(
          c.debut - make_interval(mins => s.tampon_avant_minutes),
          c.debut + make_interval(mins => s.duree_minutes + s.tampon_apres_minutes),
          '[)'
        )
    )
  order by 1;
$$;

create or replace function public.creneaux_disponibles(p_service_id uuid, p_du date, p_au date)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select debut from private.creneaux(p_service_id, p_du, p_au);
$$;
revoke all on function public.creneaux_disponibles(uuid, date, date) from public;
grant execute on function public.creneaux_disponibles(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Résumé et message WhatsApp
-- ---------------------------------------------------------------------------
-- « mardi 12 novembre 2026 à 10 h 00 », dans le fuseau du salon (sans dépendre de la locale).
create or replace function private.date_longue(p_instant timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  with l as (select p_instant at time zone private.fuseau_salon() as t)
  select (array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'])[extract(dow from t)::integer + 1]
      || ' ' || case when extract(day from t) = 1 then '1er' else extract(day from t)::integer::text end
      || ' ' || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                       'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from t)::integer]
      || ' ' || extract(year from t)::integer
      || ' à ' || to_char(t, 'FMHH24') || ' h ' || to_char(t, 'MI')
  from l;
$$;

create or replace function private.duree_lisible(p_minutes integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_minutes < 60 then p_minutes || ' min'
    when p_minutes % 60 = 0 then (p_minutes / 60) || ' h'
    else (p_minutes / 60) || ' h ' || lpad((p_minutes % 60)::text, 2, '0')
  end;
$$;

create or replace function private.message_whatsapp_rendez_vous(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
    'Bonjour Glorious Destiny,',
    'je souhaite confirmer mon rendez-vous ' || r.reference || ' :',
    '',
    '• ' || r.service_nom_snapshot || ' (' || private.duree_lisible(s.duree_minutes) || ')',
    '• Le ' || private.date_longue(r.debut),
    '• Prix : ' || private.fcfa(r.prix_snapshot_fcfa) || ' (réglé au salon)',
    '',
    'Nom : ' || c.nom,
    'Téléphone : ' || c.telephone,
    case when r.notes is not null then 'Note : ' || r.notes end,
    '',
    'Merci de me confirmer le rendez-vous.'
  )
  from public.rendez_vous r
  join public.clientes c on c.id = r.cliente_id
  join public.services s on s.id = r.service_id
  where r.id = p_id;
$$;

create or replace function private.resume_rendez_vous(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'reference', r.reference,
    'statut', r.statut,
    'debut', r.debut,
    'fin', r.fin,
    'created_at', r.created_at,
    'motif_annulation', r.motif_annulation,
    'annulable', r.statut in ('demande', 'confirme')
      and r.debut > now() + make_interval(hours => private.parametre_entier('delai_annulation_heures', 3)),
    'service', jsonb_build_object(
      'slug', s.slug, 'nom', r.service_nom_snapshot, 'duree_minutes', s.duree_minutes,
      'prix_fcfa', r.prix_snapshot_fcfa
    ),
    'cliente', jsonb_build_object('nom', c.nom, 'telephone', c.telephone),
    'message_whatsapp', private.message_whatsapp_rendez_vous(r.id),
    'message_whatsapp_ouvert_at', r.message_whatsapp_ouvert_at
  )
  from public.rendez_vous r
  join public.clientes c on c.id = r.cliente_id
  join public.services s on s.id = r.service_id
  where r.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Réservation (visiteuses)
-- ---------------------------------------------------------------------------
create or replace function public.reserver_rendez_vous(p_rdv jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cle text := p_rdv ->> 'cle_idempotence';
  v_cliente jsonb := coalesce(p_rdv -> 'cliente', '{}'::jsonb);
  v_nom text := trim(coalesce(v_cliente ->> 'nom', ''));
  v_tel text := trim(coalesce(v_cliente ->> 'telephone', ''));
  v_notes text := nullif(trim(coalesce(p_rdv ->> 'notes', '')), '');
  v_service public.services;
  v_debut timestamptz;
  v_jour date;
  v_existant uuid;
  v_cliente_id uuid;
  v_id uuid := gen_random_uuid();
  v_nb integer;
begin
  -- Idempotence : un double envoi renvoie le rendez-vous déjà créé.
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant de réservation manquant' using errcode = '22023';
  end if;
  select id into v_existant from public.rendez_vous where cle_idempotence = v_cle;
  if found then
    return private.resume_rendez_vous(v_existant);
  end if;

  if length(v_nom) not between 2 and 120 then
    raise exception 'VALIDATION: nom' using errcode = '22023';
  end if;
  if v_tel !~ '^\+237[0-9]{9}$' and v_tel !~ '^\+225[0-9]{10}$' then
    raise exception 'VALIDATION: telephone' using errcode = '22023';
  end if;
  if length(coalesce(v_notes, '')) > 500 then
    raise exception 'VALIDATION: notes' using errcode = '22023';
  end if;
  begin
    select * into strict v_service from public.services
    where id = (p_rdv ->> 'service_id')::uuid and publie and archive_at is null;
  exception when no_data_found or invalid_text_representation then
    raise exception 'SERVICE_INDISPONIBLE' using errcode = 'P0002';
  end;
  begin
    v_debut := (p_rdv ->> 'debut')::timestamptz;
  exception when others then
    raise exception 'VALIDATION: creneau' using errcode = '22023';
  end;
  if v_debut is null then
    raise exception 'VALIDATION: creneau' using errcode = '22023';
  end if;

  -- Anti-abus : chaque demande bloque un créneau du salon.
  select count(*) into v_nb
  from public.rendez_vous r join public.clientes c on c.id = r.cliente_id
  where c.telephone = v_tel and r.statut = 'demande' and r.debut > now();
  if v_nb >= private.parametre_entier('max_rendez_vous_en_attente', 2) then
    raise exception 'TROP_DE_RENDEZ_VOUS' using errcode = 'P0001';
  end if;

  -- Le créneau doit être l'un de ceux que le serveur propose (horaires, délai, horizon, libre).
  v_jour := (v_debut at time zone private.fuseau_salon())::date;
  perform 1 from private.creneaux(v_service.id, v_jour, v_jour) c where c.debut = v_debut;
  if not found then
    raise exception 'CRENEAU_INDISPONIBLE' using errcode = 'P0001';
  end if;

  select id into v_cliente_id from public.clientes where telephone = v_tel and fusionnee_dans is null;
  if not found then
    insert into public.clientes (nom, telephone) values (v_nom, v_tel) returning id into v_cliente_id;
  end if;

  begin
    insert into public.rendez_vous (
      id, reference, cle_idempotence, cliente_id, service_id, debut, fin, occupe_debut, occupe_fin,
      statut, notes, service_nom_snapshot, prix_snapshot_fcfa
    ) values (
      v_id, private.generer_reference_rendez_vous(), v_cle, v_cliente_id, v_service.id,
      v_debut,
      v_debut + make_interval(mins => v_service.duree_minutes),
      v_debut - make_interval(mins => v_service.tampon_avant_minutes),
      v_debut + make_interval(mins => v_service.duree_minutes + v_service.tampon_apres_minutes),
      'demande', v_notes, v_service.nom, v_service.prix_fcfa
    );
  exception when exclusion_violation then
    -- Une autre cliente a pris le créneau entre la vérification et l'enregistrement.
    raise exception 'CRENEAU_INDISPONIBLE' using errcode = 'P0001';
  end;

  perform private.journal_rendez_vous(v_id, 'creation', null, 'demande');
  return private.resume_rendez_vous(v_id);
end;
$$;
revoke all on function public.reserver_rendez_vous(jsonb) from public;
grant execute on function public.reserver_rendez_vous(jsonb) to anon, authenticated;

-- Suivi public : la référence seule ne suffit pas, il faut aussi le téléphone.
create or replace function public.suivre_rendez_vous(p_reference text, p_telephone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.resume_rendez_vous(r.id)
  from public.rendez_vous r join public.clientes c on c.id = r.cliente_id
  where r.reference = upper(trim(p_reference)) and c.telephone = trim(p_telephone);
$$;
revoke all on function public.suivre_rendez_vous(text, text) from public;
grant execute on function public.suivre_rendez_vous(text, text) to anon, authenticated;

create or replace function public.signaler_ouverture_whatsapp_rdv(p_reference text, p_telephone text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with cible as (
    select r.id from public.rendez_vous r join public.clientes c on c.id = r.cliente_id
    where r.reference = upper(trim(p_reference)) and c.telephone = trim(p_telephone)
  ), maj as (
    update public.rendez_vous set message_whatsapp_ouvert_at = now()
    where id in (select id from cible) and message_whatsapp_ouvert_at is null
    returning id
  )
  select exists (select 1 from cible);
$$;
revoke all on function public.signaler_ouverture_whatsapp_rdv(text, text) from public;
grant execute on function public.signaler_ouverture_whatsapp_rdv(text, text) to anon, authenticated;

-- Annulation par la cliente (référence + téléphone), jusqu'à quelques heures avant.
create or replace function public.annuler_rendez_vous_cliente(p_reference text, p_telephone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.rendez_vous;
begin
  select r.* into v from public.rendez_vous r join public.clientes c on c.id = r.cliente_id
  where r.reference = upper(trim(p_reference)) and c.telephone = trim(p_telephone)
  for update of r;
  if not found then
    raise exception 'RENDEZ_VOUS_INTROUVABLE' using errcode = 'P0002';
  end if;
  if v.statut not in ('demande', 'confirme') then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  if v.debut <= now() + make_interval(hours => private.parametre_entier('delai_annulation_heures', 3)) then
    raise exception 'ANNULATION_TARDIVE' using errcode = 'P0001';
  end if;
  update public.rendez_vous
  set statut = 'annule', motif_annulation = 'Annulé par la cliente', annule_at = now(), annule_par = 'cliente'
  where id = v.id;
  perform private.journal_rendez_vous(v.id, 'annulation', v.statut, 'annule', 'Annulé par la cliente');
  return private.resume_rendez_vous(v.id);
end;
$$;
revoke all on function public.annuler_rendez_vous_cliente(text, text) from public;
grant execute on function public.annuler_rendez_vous_cliente(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Actions de l'équipe (rôle ventes ; owner et admin ont tous les droits)
-- ---------------------------------------------------------------------------
create or replace function private.rendez_vous_verrouille(p_id uuid)
returns public.rendez_vous
language plpgsql
security definer
set search_path = ''
as $$
declare v public.rendez_vous;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  select * into v from public.rendez_vous where id = p_id for update;
  if not found then
    raise exception 'RENDEZ_VOUS_INTROUVABLE' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

create or replace function public.confirmer_rendez_vous(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v public.rendez_vous := private.rendez_vous_verrouille(p_id);
begin
  if v.statut <> 'demande' then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  update public.rendez_vous set statut = 'confirme', confirme_at = now() where id = p_id;
  perform private.journal_rendez_vous(p_id, 'confirmation', 'demande', 'confirme');
  return private.resume_rendez_vous(p_id);
end;
$$;

create or replace function public.annuler_rendez_vous(p_id uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v public.rendez_vous := private.rendez_vous_verrouille(p_id);
begin
  if v.statut not in ('demande', 'confirme') then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  update public.rendez_vous
  set statut = 'annule', motif_annulation = trim(p_motif), annule_at = now(), annule_par = 'equipe'
  where id = p_id;
  perform private.journal_rendez_vous(p_id, 'annulation', v.statut, 'annule', p_motif);
  return private.resume_rendez_vous(p_id);
end;
$$;

-- Après l'heure du rendez-vous : venue (termine) ou absence (absent).
create or replace function public.cloturer_rendez_vous(p_id uuid, p_issue text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v public.rendez_vous := private.rendez_vous_verrouille(p_id);
begin
  if p_issue not in ('termine', 'absent') then
    raise exception 'VALIDATION: issue' using errcode = '22023';
  end if;
  if v.statut not in ('demande', 'confirme') or v.debut > now() then
    raise exception 'TRANSITION_IMPOSSIBLE: %', v.statut using errcode = 'P0001';
  end if;
  update public.rendez_vous set statut = p_issue, cloture_at = now() where id = p_id;
  perform private.journal_rendez_vous(p_id, p_issue, v.statut, p_issue);
  return private.resume_rendez_vous(p_id);
end;
$$;

-- Fermer une journée : refusé tant qu'il reste des rendez-vous actifs ce jour-là
-- (l'équipe doit d'abord prévenir et annuler, pour qu'aucune cliente ne vienne pour rien).
create or replace function public.fermer_journee(p_date date, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_nb integer;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_date < (now() at time zone private.fuseau_salon())::date then
    raise exception 'VALIDATION: date passée' using errcode = '22023';
  end if;
  select count(*) into v_nb from public.rendez_vous
  where statut in ('demande', 'confirme') and (debut at time zone private.fuseau_salon())::date = p_date;
  if v_nb > 0 then
    raise exception 'RDV_EXISTANTS: %', v_nb using errcode = 'P0001';
  end if;
  insert into public.exceptions_disponibilite (date, ferme, motif)
  values (p_date, true, nullif(trim(p_motif), ''))
  on conflict (date) do update set ferme = true, heure_debut = null, heure_fin = null, motif = excluded.motif;
end;
$$;

create or replace function public.rouvrir_journee(p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  delete from public.exceptions_disponibilite where date = p_date;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'confirmer_rendez_vous(uuid)', 'annuler_rendez_vous(uuid, text)', 'cloturer_rendez_vous(uuid, text)',
    'fermer_journee(date, text)', 'rouvrir_journee(date)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- Fonctions privées : jamais appelables directement.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
