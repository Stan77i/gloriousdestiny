-- Glorious Destiny — rubrique « Nos prestations » (prestations capillaires sur demande).
-- Les prestations restent dans la table services (un seul endroit pour le nom, la description,
-- le prix, la photo et la disponibilité), avec un mode de réservation :
-- • creneau : réservation d'un créneau dans l'agenda (pose de perruque, pose de cils…) ;
-- • demande : demande de rendez-vous à une date et une heure souhaitées, envoyée sur WhatsApp
--   et confirmée par l'équipe (pose frontale, traitement, coloration, montage).
-- Une demande n'est jamais présentée comme confirmée tant que l'équipe ne l'a pas acceptée.

alter table public.services
  add column mode_reservation text not null default 'creneau'
    check (mode_reservation in ('creneau', 'demande')),
  add column image text check (image is null or image ~ '^[a-z0-9/_.-]{3,200}$'),
  add column ordre smallint not null default 0;
alter table public.services alter column duree_minutes drop not null;
alter table public.services add constraint services_duree_creneau
  check (mode_reservation = 'demande' or duree_minutes is not null);
comment on column public.services.image is 'Photo de la prestation : chemin dans le bucket « produits » (prestations/…).';

-- L'agenda n'accepte que les prestations à créneau (garde-fou côté base).
create or replace function private.controler_service_creneau()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.services s where s.id = new.service_id and s.mode_reservation <> 'creneau') then
    raise exception 'VALIDATION: cette prestation se réserve sur demande' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger rendez_vous_service_creneau
  before insert or update of service_id on public.rendez_vous
  for each row execute function private.controler_service_creneau();

-- Les quatre prestations officielles (prix donnés par la cliente le 12/11/2026).
insert into public.services (slug, nom, description, type, duree_minutes, prix_fcfa, publie, mode_reservation, ordre)
values
  ('pose-frontale', 'Pose frontale',
   'Profitez d’une pose frontale soignée pour un rendu naturel, élégant et harmonieux. La prestation vise à mettre en valeur votre visage, à travailler les contours et à obtenir une finition propre et esthétique.',
   'perruque', null, 5000, true, 'demande', 1),
  ('traitement-de-perruque', 'Traitement de perruque',
   'Offrez une nouvelle attention à votre perruque grâce à un traitement capillaire adapté. L’objectif est de prendre soin des fibres, d’améliorer leur apparence et de redonner à votre perruque un aspect plus soigné.',
   'perruque', null, 3000, true, 'demande', 2),
  ('coloration-de-perruque', 'Coloration de perruque',
   'Envie de changer de style ? Donnez une nouvelle personnalité à votre perruque grâce à une coloration réalisée avec soin. Une prestation pensée pour apporter une nouvelle nuance, un rendu harmonieux et une finition élégante.',
   'perruque', null, 10000, true, 'demande', 3),
  ('montage-de-perruque', 'Montage de perruque',
   'Une perruque bien montée fait toute la différence. Cette prestation consiste à réaliser le montage et l’assemblage de votre perruque avec une attention particulière portée à la finition et à la présentation générale.',
   'perruque', null, 2000, true, 'demande', 4)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Demandes de prestation
-- ---------------------------------------------------------------------------
create sequence public.demandes_prestations_numero_seq;

create table public.demandes_prestations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  service_id uuid not null references public.services (id),
  nom_prestation text not null,
  prix_fcfa integer not null check (prix_fcfa >= 0),
  nom_cliente text not null check (length(trim(nom_cliente)) between 2 and 120),
  telephone text not null,
  date_souhaitee date not null,
  heure_souhaitee time not null,
  precision text check (precision is null or length(precision) <= 500),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee', 'annulee')),
  cle_idempotence text not null unique check (length(cle_idempotence) between 8 and 120),
  traitee_par uuid references auth.users (id),
  traitee_at timestamptz,
  created_at timestamptz not null default now()
);
create index demandes_prestations_statut_idx on public.demandes_prestations (statut, created_at desc);
create index demandes_prestations_telephone_idx on public.demandes_prestations (telephone, created_at desc);

alter table public.demandes_prestations enable row level security;
revoke all on public.demandes_prestations from anon, authenticated;
grant select on public.demandes_prestations to authenticated;
create policy demandes_prestations_lecture_staff on public.demandes_prestations for select to authenticated
  using (private.est_staff());
create trigger demandes_prestations_audit after insert or update or delete on public.demandes_prestations
  for each row execute function private.journaliser();
create trigger demandes_prestations_sans_suppression before delete on public.demandes_prestations
  for each row execute function private.interdire_modification();

-- Message WhatsApp rédigé par le serveur : une demande, jamais une confirmation.
create or replace function private.message_demande_prestation(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
    'Bonjour Glorious Destiny,',
    'je souhaite réserver une prestation (demande ' || d.reference || ') :',
    '',
    '• ' || d.nom_prestation,
    '• Prix : ' || private.fcfa(d.prix_fcfa),
    '• Souhaité le ' || private.date_longue((d.date_souhaitee + d.heure_souhaitee) at time zone private.fuseau_salon()),
    '',
    'Nom : ' || d.nom_cliente,
    'Téléphone : ' || d.telephone,
    case when d.precision is not null then 'Précision : ' || d.precision end,
    '',
    'Pouvez-vous me confirmer votre disponibilité ?'
  )
  from public.demandes_prestations d
  where d.id = p_id;
$$;

-- Demande publique (sans compte) : validée, enregistrée, l'équipe est prévenue.
create or replace function public.demander_prestation(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cle text := p ->> 'cle_idempotence';
  v_service public.services;
  v_nom text := trim(coalesce(p ->> 'nom', ''));
  v_tel text := trim(coalesce(p ->> 'telephone', ''));
  v_date date;
  v_heure time;
  v_precision text := nullif(trim(coalesce(p ->> 'precision', '')), '');
  v_aujourdhui date := (now() at time zone private.fuseau_salon())::date;
  v_existante public.demandes_prestations;
  v_id uuid;
  v_reference text;
begin
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant de demande' using errcode = '22023';
  end if;
  select * into v_existante from public.demandes_prestations where cle_idempotence = v_cle;
  if found then
    return jsonb_build_object('reference', v_existante.reference, 'statut', v_existante.statut,
      'prestation', v_existante.nom_prestation, 'prix_fcfa', v_existante.prix_fcfa,
      'message_whatsapp', private.message_demande_prestation(v_existante.id));
  end if;

  select * into v_service from public.services
  where slug = p ->> 'service' and publie and archive_at is null and mode_reservation = 'demande';
  if not found then
    raise exception 'SERVICE_INDISPONIBLE' using errcode = 'P0002';
  end if;
  if length(v_nom) not between 2 and 120 then
    raise exception 'VALIDATION: nom' using errcode = '22023';
  end if;
  if not private.telephone_valide(v_tel) then
    raise exception 'VALIDATION: telephone' using errcode = '22023';
  end if;
  begin
    v_date := (p ->> 'date')::date;
    v_heure := (p ->> 'heure')::time;
  exception when others then
    raise exception 'VALIDATION: date' using errcode = '22023';
  end;
  if v_date is null or v_heure is null or v_date < v_aujourdhui or v_date > v_aujourdhui + 180 then
    raise exception 'VALIDATION: date' using errcode = '22023';
  end if;
  -- Le salon reçoit jusqu'à 23 h ; une heure déjà passée aujourd'hui est refusée.
  if v_heure < time '07:00' or v_heure > time '22:30'
     or (v_date = v_aujourdhui and v_heure <= (now() at time zone private.fuseau_salon())::time) then
    raise exception 'VALIDATION: heure' using errcode = '22023';
  end if;
  if length(coalesce(v_precision, '')) > 500 then
    raise exception 'VALIDATION: precision' using errcode = '22023';
  end if;
  -- Anti-abus : trois demandes en attente au plus par numéro sur 24 h.
  if (select count(*) from public.demandes_prestations
      where telephone = v_tel and statut = 'en_attente' and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'TROP_DE_DEMANDES' using errcode = 'P0001';
  end if;

  v_reference := 'PR-' || to_char(now() at time zone private.fuseau_salon(), 'YYMM') || '-'
    || lpad(nextval('public.demandes_prestations_numero_seq')::text, 4, '0');
  insert into public.demandes_prestations (
    reference, service_id, nom_prestation, prix_fcfa, nom_cliente, telephone,
    date_souhaitee, heure_souhaitee, precision, cle_idempotence
  )
  values (
    v_reference, v_service.id, v_service.nom, v_service.prix_fcfa, v_nom, v_tel,
    v_date, v_heure, v_precision, v_cle
  )
  returning id into v_id;

  perform private.notifier(
    'rdv_nouveau', 'ventes',
    'Demande de prestation : ' || v_service.nom,
    v_nom || ' souhaite le ' || to_char(v_date, 'DD/MM/YYYY') || ' à ' || to_char(v_heure, 'HH24"h"MI')
      || '. Référence ' || v_reference || ', en attente de confirmation.',
    '/admin/rendez-vous',
    jsonb_build_object('demande_prestation_id', v_id),
    'demande_prestation:' || v_id
  );
  return jsonb_build_object('reference', v_reference, 'statut', 'en_attente',
    'prestation', v_service.nom, 'prix_fcfa', v_service.prix_fcfa,
    'message_whatsapp', private.message_demande_prestation(v_id));
end;
$$;
revoke all on function public.demander_prestation(jsonb) from public;
grant execute on function public.demander_prestation(jsonb) to anon, authenticated;

-- Traitement par l'équipe : acceptée, refusée ou annulée (jamais supprimée).
create or replace function public.traiter_demande_prestation(p_id uuid, p_statut text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_statut not in ('acceptee', 'refusee', 'annulee') then
    raise exception 'VALIDATION: statut' using errcode = '22023';
  end if;
  update public.demandes_prestations
  set statut = p_statut, traitee_par = (select auth.uid()), traitee_at = now()
  where id = p_id and statut = 'en_attente';
  if not found then
    raise exception 'TRANSITION_IMPOSSIBLE' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.traiter_demande_prestation(uuid, text) from public, anon;
grant execute on function public.traiter_demande_prestation(uuid, text) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to authenticated, anon;
