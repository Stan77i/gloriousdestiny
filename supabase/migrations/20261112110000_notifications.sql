-- Glorious Destiny — notifications.
-- Fondations : chaque notification a un déclencheur réel (écriture en base ou tâche planifiée),
-- un texte construit à partir des données réelles (produit, fiche, stock, commande, rendez-vous),
-- une clé d'unicité (jamais deux fois la même alerte), un destinataire par rôle, un statut lu /
-- non lu par personne, des préférences par personne. Le push est prêt côté données
-- (abonnements avec consentement) ; l'envoi demandera une clé VAPID et une fonction serveur.
--
-- Côté clientes (sans compte) : « Prévenez-moi au retour en stock » avec consentement explicite.
-- Au retour en stock, l'équipe reçoit la liste des clientes à prévenir et le message prêt.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  type text not null check (type in (
    'commande_nouvelle', 'commande_attente', 'rdv_nouveau', 'rdv_rappels',
    'stock_bas', 'stock_epuise', 'retour_stock', 'alerte_stock_demandee'
  )),
  -- Rôle destinataire (owner et admin reçoivent tout). Null : tout le personnel.
  role_cible text check (role_cible is null or role_cible in ('ventes', 'stock', 'logistique')),
  titre text not null check (length(titre) between 1 and 160),
  corps text not null check (length(corps) between 1 and 600),
  lien text check (lien is null or lien ~ '^/admin(/[a-z0-9/_-]*)?$'),
  donnees jsonb not null default '{}'::jsonb,
  cle_dedup text not null unique check (length(cle_dedup) between 3 and 200),
  created_at timestamptz not null default now()
);
create index notifications_date_idx on public.notifications (created_at desc);

create table public.notifications_lues (
  notification_id bigint not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  lu_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);
create index notifications_lues_user_idx on public.notifications_lues (user_id);

create table public.preferences_notifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  types_coupes text[] not null default '{}',
  push_actif boolean not null default false,
  heures_calmes_debut time,
  heures_calmes_fin time,
  updated_at timestamptz not null default now(),
  check ((heures_calmes_debut is null) = (heures_calmes_fin is null))
);

-- Abonnements Web Push (navigateur de l'équipe). Consentement obligatoire, révocable.
create table public.abonnements_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text,
  consentement_at timestamptz not null default now(),
  revoque_at timestamptz,
  created_at timestamptz not null default now()
);
create index abonnements_push_user_idx on public.abonnements_push (user_id);

-- Demandes « Prévenez-moi » des clientes (sans compte).
create table public.alertes_retour_stock (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes (id),
  nom text not null check (length(trim(nom)) between 2 and 120),
  telephone text not null check (telephone ~ '^\+(237[0-9]{9}|225[0-9]{10})$'),
  consentement_at timestamptz not null,
  created_at timestamptz not null default now(),
  prevenue_at timestamptz,
  annulee_at timestamptz
);
create unique index alertes_retour_stock_active_uidx
  on public.alertes_retour_stock (variante_id, telephone) where prevenue_at is null and annulee_at is null;
create index alertes_retour_stock_variante_idx on public.alertes_retour_stock (variante_id);

-- ---------------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notifications_lues enable row level security;
alter table public.preferences_notifications enable row level security;
alter table public.abonnements_push enable row level security;
alter table public.alertes_retour_stock enable row level security;
revoke all on public.notifications, public.notifications_lues, public.preferences_notifications,
  public.abonnements_push, public.alertes_retour_stock from anon, authenticated;

grant select on public.notifications to authenticated;
create policy notifications_lecture on public.notifications for select to authenticated
  using (
    (select private.est_staff())
    and (role_cible is null or (select private.a_role(array[role_cible])))
  );

grant select on public.notifications_lues to authenticated;
create policy notifications_lues_lecture on public.notifications_lues for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.preferences_notifications to authenticated;
create policy preferences_lecture on public.preferences_notifications for select to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.abonnements_push to authenticated;
create policy abonnements_lecture on public.abonnements_push for select to authenticated
  using (user_id = (select auth.uid()));
create policy abonnements_suppression on public.abonnements_push for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.alertes_retour_stock to authenticated;
create policy alertes_lecture on public.alertes_retour_stock for select to authenticated
  using ((select private.a_role(array['ventes'])));

-- ---------------------------------------------------------------------------
-- Création (interne) : une seule fois par clé
-- ---------------------------------------------------------------------------
create or replace function private.notifier(
  p_type text, p_role text, p_titre text, p_corps text, p_lien text, p_donnees jsonb, p_cle text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (type, role_cible, titre, corps, lien, donnees, cle_dedup)
  values (p_type, p_role, left(p_titre, 160), left(p_corps, 600), p_lien, coalesce(p_donnees, '{}'::jsonb), p_cle)
  on conflict (cle_dedup) do nothing;
$$;

-- Nom affiché d'une variante (« Lace Glue » ou « Braid Gel · 250 g »).
create or replace function private.nom_variante(p_variante_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.nom || case when v.libelle <> 'Format standard' then ' · ' || v.libelle else '' end
  from public.variantes v join public.produits p on p.id = v.produit_id
  where v.id = p_variante_id;
$$;

-- ---------------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------------
-- Nouvelle commande (après enregistrement complet : lignes et total connus).
create or replace function private.notifier_commande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
begin
  if new.evenement <> 'creation' then
    return new;
  end if;
  select c.reference, c.total_fcfa, cl.nom as cliente, v.nom as ville,
         (select sum(quantite) from public.commande_lignes where commande_id = c.id) as articles
  into o
  from public.commandes c
  join public.clientes cl on cl.id = c.cliente_id
  join public.villes v on v.id = c.ville_id
  where c.id = new.commande_id;
  perform private.notifier(
    'commande_nouvelle', 'ventes',
    'Nouvelle commande ' || o.reference,
    o.cliente || ' · ' || o.articles || ' article(s) · ' || private.fcfa(o.total_fcfa) || ' · ' || o.ville
      || '. À confirmer sur WhatsApp.',
    '/admin/commandes/' || new.commande_id,
    jsonb_build_object('commande_id', new.commande_id),
    'commande_nouvelle:' || new.commande_id
  );
  return new;
end;
$$;
create trigger commande_historique_notifier
  after insert on public.commande_historique
  for each row execute function private.notifier_commande();

-- Nouveau rendez-vous réservé en ligne.
create or replace function private.notifier_rdv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  if new.evenement <> 'creation' then
    return new;
  end if;
  select rv.reference, rv.debut, coalesce(rv.service_nom_snapshot, s.nom) as service, c.nom as cliente
  into r
  from public.rendez_vous rv
  join public.services s on s.id = rv.service_id
  join public.clientes c on c.id = rv.cliente_id
  where rv.id = new.rendez_vous_id;
  perform private.notifier(
    'rdv_nouveau', 'ventes',
    'Rendez-vous demandé : ' || r.service,
    r.cliente || ' · ' || private.date_longue(r.debut) || ' · ' || r.reference || '. À confirmer sur WhatsApp.',
    '/admin/rendez-vous',
    jsonb_build_object('rendez_vous_id', new.rendez_vous_id),
    'rdv_nouveau:' || new.rendez_vous_id
  );
  return new;
end;
$$;
create trigger rendez_vous_historique_notifier
  after insert on public.rendez_vous_historique
  for each row execute function private.notifier_rdv();

-- Stock : passage sous le seuil, épuisement, retour en stock (une alerte par article et par jour).
create or replace function private.notifier_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_nom text;
  v_jour text := to_char(now() at time zone private.fuseau_salon(), 'YYYY-MM-DD');
  v_attente integer;
begin
  if new.disponible = old.disponible then
    return new;
  end if;
  select pr.seuil_alerte, pr.delai_appro_jours, pr.publie, pr.fiche ->> 'accroche' as accroche
  into p
  from public.variantes va join public.produits pr on pr.id = va.produit_id
  where va.id = new.variante_id;
  v_nom := private.nom_variante(new.variante_id);

  if old.disponible > 0 and new.disponible <= 0 then
    perform private.notifier(
      'stock_epuise', 'stock',
      v_nom || ' est épuisé',
      'Plus aucune unité disponible à la vente'
        || case when new.reserve > 0 then ' (' || new.reserve || ' réservée(s) par des commandes en cours)' else '' end
        || '. Le site l''affiche « Épuisé »'
        || case when p.delai_appro_jours is not null then ' ; délai fournisseur habituel : ' || p.delai_appro_jours || ' j.' else '.' end,
      '/admin/stock',
      jsonb_build_object('variante_id', new.variante_id, 'disponible', new.disponible),
      'stock_epuise:' || new.variante_id || ':' || v_jour
    );
  elsif old.disponible > p.seuil_alerte and new.disponible <= p.seuil_alerte and new.disponible > 0 then
    perform private.notifier(
      'stock_bas', 'stock',
      v_nom || ' : stock bas',
      'Plus que ' || new.disponible || ' disponible(s) (seuil d''alerte : ' || p.seuil_alerte || ')'
        || case when p.delai_appro_jours is not null then '. Délai fournisseur habituel : ' || p.delai_appro_jours || ' j.' else '.' end,
      '/admin/stock',
      jsonb_build_object('variante_id', new.variante_id, 'disponible', new.disponible),
      'stock_bas:' || new.variante_id || ':' || v_jour
    );
  elsif old.disponible <= 0 and new.disponible > 0 then
    select count(*) into v_attente from public.alertes_retour_stock a
    where a.variante_id = new.variante_id and a.prevenue_at is null and a.annulee_at is null;
    perform private.notifier(
      'retour_stock', 'ventes',
      v_nom || ' est de retour en stock',
      new.disponible || ' disponible(s).'
        || case when v_attente > 0
             then ' ' || v_attente || ' cliente(s) ont demandé à être prévenue(s) : le message est prêt.'
             else '' end
        || case when p.accroche is not null then ' « ' || p.accroche || ' »' else '' end,
      case when v_attente > 0 then '/admin/clientes' else '/admin/stock' end,
      jsonb_build_object('variante_id', new.variante_id, 'attente', v_attente),
      'retour_stock:' || new.variante_id || ':' || v_jour
    );
  end if;
  return new;
end;
$$;
create trigger stocks_notifier
  after update of physique, reserve on public.stocks
  for each row execute function private.notifier_stock();

-- ---------------------------------------------------------------------------
-- Tâche planifiée : commandes qui attendent, rappels de rendez-vous à envoyer
-- ---------------------------------------------------------------------------
create or replace function private.notifications_periodiques()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_nb integer;
  v_jour text := to_char(now() at time zone private.fuseau_salon(), 'YYYY-MM-DD');
begin
  for c in
    select o.id, o.reference, cl.nom, o.created_at
    from public.commandes o join public.clientes cl on cl.id = o.cliente_id
    where o.statut = 'nouvelle'
      and o.created_at < now() - make_interval(hours => private.parametre_entier('alerte_confirmation_heures', 12))
  loop
    perform private.notifier(
      'commande_attente', 'ventes',
      c.reference || ' attend une confirmation',
      c.nom || ' a commandé il y a ' || floor(extract(epoch from now() - c.created_at) / 3600) || ' h. '
        || 'Sans confirmation, la réservation de stock expirera.',
      '/admin/commandes/' || c.id,
      jsonb_build_object('commande_id', c.id),
      'commande_attente:' || c.id
    );
  end loop;

  select count(*) into v_nb from public.rendez_vous r
  where r.statut in ('demande', 'confirme') and r.rappel_envoye_at is null and r.debut > now()
    and r.debut <= now() + make_interval(hours => private.parametre_entier('rappel_rdv_heures', 24));
  if v_nb > 0 then
    perform private.notifier(
      'rdv_rappels', 'ventes',
      v_nb || ' rappel(s) de rendez-vous à envoyer',
      'Des clientes ont rendez-vous dans les prochaines 24 h. Les messages WhatsApp sont prêts dans l''agenda.',
      '/admin/rendez-vous',
      jsonb_build_object('nombre', v_nb),
      'rdv_rappels:' || v_jour
    );
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('gd-notifications', '7 * * * *', 'select private.notifications_periodiques()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- API de l'équipe
-- ---------------------------------------------------------------------------
-- Notifications visibles par la personne connectée (rôle, préférences), avec lu / non lu.
create or replace function public.mes_notifications(p_limite integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_coupes text[];
begin
  if not private.est_staff() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  select coalesce(types_coupes, '{}') into v_coupes from public.preferences_notifications where user_id = v_uid;
  v_coupes := coalesce(v_coupes, '{}');
  return jsonb_build_object(
    'non_lues', (
      select count(*) from public.notifications n
      where (n.role_cible is null or private.a_role(array[n.role_cible]))
        and not (n.type = any (v_coupes))
        and not exists (select 1 from public.notifications_lues l where l.notification_id = n.id and l.user_id = v_uid)
    ),
    'liste', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select n.id, n.type, n.titre, n.corps, n.lien, n.created_at,
               exists (select 1 from public.notifications_lues l where l.notification_id = n.id and l.user_id = v_uid) as lue
        from public.notifications n
        where (n.role_cible is null or private.a_role(array[n.role_cible]))
          and not (n.type = any (v_coupes))
        order by n.created_at desc
        limit least(greatest(coalesce(p_limite, 30), 1), 100)
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.marquer_notifications_lues(p_ids bigint[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if not private.est_staff() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  insert into public.notifications_lues (notification_id, user_id)
  select n.id, v_uid from public.notifications n
  where (p_ids is null or n.id = any (p_ids))
    and (n.role_cible is null or private.a_role(array[n.role_cible]))
  on conflict do nothing;
end;
$$;

create or replace function public.enregistrer_preferences_notifications(
  p_types_coupes text[], p_heures_calmes_debut time default null, p_heures_calmes_fin time default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.est_staff() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_types_coupes, '{}')) t
    where t not in ('commande_nouvelle', 'commande_attente', 'rdv_nouveau', 'rdv_rappels',
                    'stock_bas', 'stock_epuise', 'retour_stock', 'alerte_stock_demandee')
  ) or ((p_heures_calmes_debut is null) <> (p_heures_calmes_fin is null)) then
    raise exception 'VALIDATION: preferences' using errcode = '22023';
  end if;
  insert into public.preferences_notifications (user_id, types_coupes, heures_calmes_debut, heures_calmes_fin, updated_at)
  values ((select auth.uid()), coalesce(p_types_coupes, '{}'), p_heures_calmes_debut, p_heures_calmes_fin, now())
  on conflict (user_id) do update
  set types_coupes = excluded.types_coupes, heures_calmes_debut = excluded.heures_calmes_debut,
      heures_calmes_fin = excluded.heures_calmes_fin, updated_at = now();
end;
$$;

-- Abonnement push du navigateur (consentement donné par le clic « Activer »).
create or replace function public.enregistrer_abonnement_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.est_staff() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' or length(coalesce(p_p256dh, '')) < 20 or length(coalesce(p_auth, '')) < 10 then
    raise exception 'VALIDATION: abonnement' using errcode = '22023';
  end if;
  insert into public.abonnements_push (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, revoque_at = null, consentement_at = now();
  insert into public.preferences_notifications (user_id, push_actif) values ((select auth.uid()), true)
  on conflict (user_id) do update set push_actif = true, updated_at = now();
end;
$$;

-- Clientes à prévenir d'un retour en stock, avec le message prêt (fiche produit réelle).
create or replace function public.alertes_a_prevenir()
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
      'id', a.id, 'nom', a.nom, 'telephone', a.telephone, 'produit', private.nom_variante(a.variante_id),
      'disponible', coalesce(s.disponible, 0), 'demande_le', a.created_at,
      'message', concat_ws(E'\n',
        'Bonjour ' || split_part(a.nom, ' ', 1) || ',',
        'bonne nouvelle : ' || private.nom_variante(a.variante_id) || ' est de nouveau disponible chez Glorious Destiny.',
        case when p.fiche ->> 'accroche' is not null then p.fiche ->> 'accroche' end,
        'Répondez à ce message pour le commander. (Vous recevez ce message car vous avez demandé à être prévenue.)'
      )
    ) order by a.created_at)
    from public.alertes_retour_stock a
    join public.variantes v on v.id = a.variante_id
    join public.produits p on p.id = v.produit_id
    left join public.stocks s on s.variante_id = a.variante_id and s.emplacement_id = private.emplacement_principal()
    where a.prevenue_at is null and a.annulee_at is null and coalesce(s.disponible, 0) > 0
  ), '[]'::jsonb);
end;
$$;

create or replace function public.marquer_alerte_prevenue(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.alertes_retour_stock set prevenue_at = now() where id = p_id and prevenue_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- API publique : « Prévenez-moi au retour en stock »
-- ---------------------------------------------------------------------------
create or replace function public.demander_alerte_retour_stock(
  p_variante_id uuid, p_nom text, p_telephone text, p_consentement boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom text := trim(coalesce(p_nom, ''));
  v_tel text := trim(coalesce(p_telephone, ''));
  v_dispo integer;
  v_nb integer;
begin
  if p_consentement is not true then
    raise exception 'VALIDATION: consentement' using errcode = '22023';
  end if;
  if length(v_nom) not between 2 and 120 then
    raise exception 'VALIDATION: nom' using errcode = '22023';
  end if;
  if v_tel !~ '^\+(237[0-9]{9}|225[0-9]{10})$' then
    raise exception 'VALIDATION: telephone' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.variantes v join public.produits p on p.id = v.produit_id
    where v.id = p_variante_id and v.actif and p.publie and p.archive_at is null
  ) then
    raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
  end if;
  select coalesce(disponible, 0) into v_dispo from public.stocks
  where variante_id = p_variante_id and emplacement_id = private.emplacement_principal();
  if coalesce(v_dispo, 0) > 0 then
    return 'disponible';
  end if;
  -- Anti-abus : 5 demandes actives au plus par numéro.
  select count(*) into v_nb from public.alertes_retour_stock
  where telephone = v_tel and prevenue_at is null and annulee_at is null;
  if v_nb >= 5 then
    raise exception 'TROP_DE_DEMANDES' using errcode = 'P0001';
  end if;
  insert into public.alertes_retour_stock (variante_id, nom, telephone, consentement_at)
  values (p_variante_id, v_nom, v_tel, now())
  on conflict do nothing;
  if found then
    perform private.notifier(
      'alerte_stock_demandee', 'ventes',
      'Demande de retour en stock : ' || private.nom_variante(p_variante_id),
      v_nom || ' souhaite être prévenue dès le retour en stock.',
      '/admin/stock',
      jsonb_build_object('variante_id', p_variante_id),
      'alerte_stock_demandee:' || p_variante_id || ':' || to_char(now() at time zone private.fuseau_salon(), 'YYYY-MM-DD')
    );
  end if;
  return 'enregistree';
end;
$$;
revoke all on function public.demander_alerte_retour_stock(uuid, text, text, boolean) from public;
grant execute on function public.demander_alerte_retour_stock(uuid, text, text, boolean) to anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'mes_notifications(integer)', 'marquer_notifications_lues(bigint[])',
    'enregistrer_preferences_notifications(text[], time, time)',
    'enregistrer_abonnement_push(text, text, text, text)',
    'alertes_a_prevenir()', 'marquer_alerte_prevenue(uuid)'
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
