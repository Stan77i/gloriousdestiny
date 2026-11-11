-- Glorious Destiny — pays desservis : Cameroun (salon), Côte d'Ivoire, Gabon, Congo, Sénégal,
-- Guinée, Canada, Royaume-Uni. Une ville par pays pour commencer (modifiable en base).
-- • Table des pays : nom, indicatif, longueur du numéro national (validation des téléphones),
--   zéro initial à retirer (Royaume-Uni). Les règles ne sont plus figées sur +237 / +225.
-- • Les montants restent en FCFA partout ; hors zone CFA, la commande est libellée en XAF et la
--   devise locale de la ville est une information (conversion convenue sur WhatsApp).

create table public.pays (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  nom text not null unique check (length(trim(nom)) between 2 and 80),
  indicatif text not null unique check (indicatif ~ '^\+[1-9][0-9]{0,3}$'),
  chiffres_min smallint not null check (chiffres_min between 6 and 12),
  chiffres_max smallint not null check (chiffres_max between 6 and 12),
  zero_initial_retire boolean not null default false,
  ordre smallint not null default 0,
  actif boolean not null default true,
  check (chiffres_min <= chiffres_max)
);
comment on table public.pays is 'Pays desservis : indicatif et longueur du numéro national (sans indicatif).';

insert into public.pays (code, nom, indicatif, chiffres_min, chiffres_max, zero_initial_retire, ordre) values
  ('CM', 'Cameroun', '+237', 9, 9, false, 1),
  ('CI', 'Côte d’Ivoire', '+225', 10, 10, false, 2),
  ('GA', 'Gabon', '+241', 8, 9, false, 3),
  ('CG', 'Congo', '+242', 9, 9, false, 4),
  ('SN', 'Sénégal', '+221', 9, 9, false, 5),
  ('GN', 'Guinée', '+224', 9, 9, false, 6),
  ('CA', 'Canada', '+1', 10, 10, false, 7),
  ('GB', 'Royaume-Uni', '+44', 9, 10, true, 8)
on conflict (code) do nothing;

alter table public.pays enable row level security;
revoke all on public.pays from anon, authenticated;
grant select on public.pays to anon, authenticated;
create policy pays_lecture on public.pays for select to anon, authenticated using (true);

-- Villes : contraintes ouvertes aux nouveaux pays.
alter table public.villes drop constraint villes_pays_check;
alter table public.villes drop constraint villes_indicatif_check;
alter table public.villes drop constraint villes_devise_check;
alter table public.villes drop constraint villes_fuseau_check;
alter table public.villes add constraint villes_pays_fk foreign key (pays) references public.pays (code);
alter table public.villes add constraint villes_devise_check check (devise in ('XAF', 'XOF', 'CAD', 'GBP', 'GNF'));
alter table public.villes add constraint villes_fuseau_check check (fuseau in (
  'Africa/Douala', 'Africa/Abidjan', 'Africa/Libreville', 'Africa/Brazzaville', 'Africa/Dakar',
  'Africa/Conakry', 'America/Toronto', 'Europe/London'
));
create index villes_pays_idx on public.villes (pays);

-- Indicatif d'une ville = celui de son pays.
create or replace function private.controler_indicatif_ville()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.indicatif is distinct from (select indicatif from public.pays where code = new.pays) then
    raise exception 'VALIDATION: indicatif de la ville' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger villes_indicatif_pays
  before insert or update of pays, indicatif on public.villes
  for each row execute function private.controler_indicatif_ville();

insert into public.villes (nom, pays, indicatif, devise, fuseau, ordre, latitude, longitude) values
  ('Libreville', 'GA', '+241', 'XAF', 'Africa/Libreville', 5, 0.41620, 9.46730),
  ('Brazzaville', 'CG', '+242', 'XAF', 'Africa/Brazzaville', 6, -4.26340, 15.24290),
  ('Dakar', 'SN', '+221', 'XOF', 'Africa/Dakar', 7, 14.71670, -17.46770),
  ('Conakry', 'GN', '+224', 'GNF', 'Africa/Conakry', 8, 9.64120, -13.57840),
  ('Montréal', 'CA', '+1', 'CAD', 'America/Toronto', 9, 45.50190, -73.56740),
  ('Londres', 'GB', '+44', 'GBP', 'Europe/London', 10, 51.50720, -0.12760)
on conflict (nom) do nothing;

-- Téléphone valide : format E.164 d'un pays desservi (ou du pays donné), longueur du pays.
create or replace function private.telephone_valide(p_tel text, p_indicatif text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_tel ~ '^\+[1-9][0-9]{6,14}$' and exists (
    select 1 from public.pays pa
    where pa.actif
      and (p_indicatif is null or pa.indicatif = p_indicatif)
      and left(p_tel, length(pa.indicatif)) = pa.indicatif
      and length(p_tel) - length(pa.indicatif) between pa.chiffres_min and pa.chiffres_max
  ), false);
$$;

alter table public.alertes_retour_stock drop constraint alertes_retour_stock_telephone_check;
alter table public.alertes_retour_stock add constraint alertes_retour_stock_telephone_check
  check (telephone ~ '^\+[1-9][0-9]{6,14}$');

-- Commande : téléphone selon le pays de la ville, devise FCFA.
create or replace function public.creer_commande(p_commande jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cle text := p_commande ->> 'cle_idempotence';
  v_cliente jsonb := coalesce(p_commande -> 'cliente', '{}'::jsonb);
  v_adresse jsonb := coalesce(p_commande -> 'adresse', '{}'::jsonb);
  v_lignes jsonb := p_commande -> 'lignes';
  v_ville public.villes;
  v_nom text := trim(coalesce(v_cliente ->> 'nom', ''));
  v_tel text := trim(coalesce(v_cliente ->> 'telephone', ''));
  v_email text := nullif(trim(coalesce(v_cliente ->> 'email', '')), '');
  v_quartier text := trim(coalesce(v_adresse ->> 'quartier', ''));
  v_repere text := trim(coalesce(v_adresse ->> 'point_de_repere', ''));
  v_rue text := nullif(trim(coalesce(v_adresse ->> 'adresse', '')), '');
  v_notes text := nullif(trim(coalesce(p_commande ->> 'notes', '')), '');
  v_existante uuid;
  v_cliente_id uuid;
  v_commande_id uuid := gen_random_uuid();
  v_reference text;
  v_delai integer;
  v_sous_total integer := 0;
  v_nb integer;
  v_ligne record;
  v_produit record;
begin
  -- Idempotence : un double envoi renvoie la commande déjà créée.
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant de commande manquant' using errcode = '22023';
  end if;
  select id into v_existante from public.commandes where cle_idempotence = v_cle;
  if found then
    return private.resume_commande(v_existante);
  end if;

  -- Validation des coordonnées (le navigateur valide aussi, mais seul ce contrôle fait foi).
  if length(v_nom) not between 2 and 120 then
    raise exception 'VALIDATION: nom' using errcode = '22023';
  end if;
  begin
    select * into strict v_ville from public.villes
    where id = (v_adresse ->> 'ville_id')::smallint and actif;
  exception when no_data_found or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'VALIDATION: ville' using errcode = '22023';
  end;
  if not private.telephone_valide(v_tel, v_ville.indicatif) then
    raise exception 'VALIDATION: telephone' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'VALIDATION: email' using errcode = '22023';
  end if;
  if length(v_quartier) not between 1 and 120 or length(v_repere) not between 1 and 300
     or length(coalesce(v_rue, '')) > 300 or length(coalesce(v_notes, '')) > 1000 then
    raise exception 'VALIDATION: adresse' using errcode = '22023';
  end if;
  if jsonb_typeof(v_lignes) is distinct from 'array' or jsonb_array_length(v_lignes) not between 1 and 30 then
    raise exception 'VALIDATION: panier' using errcode = '22023';
  end if;

  -- Anti-abus : au plus 3 commandes non confirmées par téléphone sur 24 h
  -- (chaque commande réserve du stock).
  select count(*) into v_nb
  from public.commandes o join public.clientes c on c.id = o.cliente_id
  where c.telephone = v_tel and o.statut = 'nouvelle' and o.created_at > now() - interval '24 hours';
  if v_nb >= 3 then
    raise exception 'TROP_DE_COMMANDES' using errcode = 'P0001';
  end if;

  -- Cliente : retrouvée par téléphone, sinon créée.
  select id into v_cliente_id from public.clientes where telephone = v_tel and fusionnee_dans is null;
  if not found then
    insert into public.clientes (nom, telephone, email) values (v_nom, v_tel, v_email)
    returning id into v_cliente_id;
  elsif v_email is not null then
    update public.clientes set email = coalesce(email, v_email) where id = v_cliente_id and email is null;
  end if;

  -- Adresse : réutilisée si identique, sinon ajoutée au carnet.
  perform 1 from public.adresses_clientes
  where cliente_id = v_cliente_id and ville_id = v_ville.id
    and lower(quartier) = lower(v_quartier) and lower(point_de_repere) = lower(v_repere)
    and coalesce(lower(adresse), '') = coalesce(lower(v_rue), '');
  if not found then
    insert into public.adresses_clientes (cliente_id, ville_id, quartier, adresse, point_de_repere)
    values (v_cliente_id, v_ville.id, v_quartier, v_rue, v_repere);
  end if;

  v_reference := private.generer_reference_commande();
  select coalesce((valeur #>> '{}')::integer, 48) into v_delai
  from public.parametres where cle = 'delai_expiration_reservation_heures';
  v_delai := coalesce(v_delai, 48);

  insert into public.commandes (
    id, reference, cliente_id, ville_id, devise, canal, statut,
    sous_total_fcfa, frais_livraison_fcfa, total_fcfa, cle_idempotence, reservation_expire_at, notes_internes
  )
  values (
    v_commande_id, v_reference, v_cliente_id, v_ville.id,
    -- Montants toujours en FCFA : hors zone CFA, la commande est libellée en XAF.
    case when v_ville.devise in ('XAF', 'XOF') then v_ville.devise else 'XAF' end, 'whatsapp', 'nouvelle',
    0, 0, 0, v_cle, now() + make_interval(hours => v_delai),
    case when v_notes is not null then 'Note de la cliente : ' || v_notes end
  );

  -- Lignes : prix relus en base, quantités cumulées par variante, stock réservé
  -- dans un ordre stable (pas d'interblocage entre commandes simultanées).
  for v_ligne in
    select (x ->> 'variante_id') as variante_id, sum((x ->> 'quantite')::integer)::integer as quantite
    from jsonb_array_elements(v_lignes) x
    group by 1
    order by 1
  loop
    if v_ligne.quantite is null or v_ligne.quantite not between 1 and 20 then
      raise exception 'VALIDATION: quantite' using errcode = '22023';
    end if;
    begin
      select v.id, p.nom, v.libelle, coalesce(v.prix_fcfa, p.prix_fcfa) as prix
      into strict v_produit
      from public.variantes v join public.produits p on p.id = v.produit_id
      where v.id = v_ligne.variante_id::uuid and v.actif and p.publie and p.archive_at is null;
    exception when no_data_found or invalid_text_representation then
      raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
    end;

    insert into public.commande_lignes (
      commande_id, variante_id, nom_snapshot, prix_unitaire_snapshot_fcfa, quantite, total_ligne_fcfa
    )
    values (
      v_commande_id, v_produit.id,
      v_produit.nom || case when v_produit.libelle <> 'Format standard' then ' · ' || v_produit.libelle else '' end,
      v_produit.prix, v_ligne.quantite, v_produit.prix * v_ligne.quantite
    );

    begin
      perform private.appliquer_mouvement_stock(
        v_produit.id, 'reservation', 0, v_ligne.quantite, 'commande', v_commande_id, null,
        'reservation:' || v_commande_id || ':' || v_produit.id
      );
    exception when others then
      if sqlerrm like 'STOCK_INSUFFISANT%' then
        raise exception 'STOCK_INSUFFISANT: %', v_produit.nom using errcode = 'P0001';
      end if;
      raise;
    end;
    v_sous_total := v_sous_total + v_produit.prix * v_ligne.quantite;
  end loop;

  update public.commandes
  set sous_total_fcfa = v_sous_total, total_fcfa = v_sous_total
  where id = v_commande_id;

  insert into public.livraisons (commande_id, ville_id, quartier, adresse, point_de_repere, telephone)
  values (v_commande_id, v_ville.id, v_quartier, v_rue, v_repere, v_tel);

  perform private.journal_commande(v_commande_id, 'creation', null, 'nouvelle');
  return private.resume_commande(v_commande_id);
end;
$$;
revoke all on function public.creer_commande(jsonb) from public;
grant execute on function public.creer_commande(jsonb) to anon, authenticated;

-- Réservation : téléphone d'un pays desservi.
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
  if not private.telephone_valide(v_tel) then
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

-- « Prévenez-moi » : téléphone d'un pays desservi.
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
  if not private.telephone_valide(v_tel) then
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

-- Carte : noms des pays depuis la table.
create or replace function public.carte_activite(p_du date, p_au date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := private.fuseau_salon();
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_du is null or p_au is null or p_du > p_au or p_au - p_du > 366 then
    raise exception 'VALIDATION: periode' using errcode = '22023';
  end if;

  return (
    with recues as (
      select o.id, o.ville_id, o.cliente_id, o.statut, o.created_at
      from public.commandes o
      where (o.created_at at time zone v_tz)::date between p_du and p_au
    ),
    ventes as (
      select o.id, o.ville_id, o.cliente_id,
             (select coalesce(sum(cl.total_ligne_fcfa - cl.quantite_retournee * cl.prix_unitaire_snapshot_fcfa), 0)
              from public.commande_lignes cl where cl.commande_id = o.id) as ca
      from public.commandes o
      where o.confirmee_at is not null and o.statut <> 'annulee'
        and (o.confirmee_at at time zone v_tz)::date between p_du and p_au
    ),
    par_ville as (
      select
        v.id, v.nom, v.pays, v.devise, v.latitude, v.longitude, v.ordre,
        (select count(*) from recues r where r.ville_id = v.id and r.statut <> 'annulee') as commandes,
        (select count(*) from recues r where r.ville_id = v.id and r.statut in ('livree', 'retournee')) as livrees,
        (select count(*) from recues r where r.ville_id = v.id and r.statut in ('confirmee', 'expediee')) as en_cours,
        (select count(*) from recues r where r.ville_id = v.id and r.statut = 'nouvelle') as a_confirmer,
        (select count(*) from recues r where r.ville_id = v.id and r.statut = 'annulee') as annulees,
        (select coalesce(sum(ca), 0) from ventes x where x.ville_id = v.id) as ca,
        (select count(*) from ventes x where x.ville_id = v.id) as ventes,
        (select count(distinct cliente_id) from recues r where r.ville_id = v.id and r.statut <> 'annulee') as clientes,
        (select max(r.created_at) from recues r where r.ville_id = v.id) as derniere
      from public.villes v
      where v.actif
    )
    select jsonb_build_object(
      'du', p_du,
      'au', p_au,
      'salon', (
        select jsonb_build_object(
          'ville', v.nom, 'latitude', v.latitude, 'longitude', v.longitude,
          'rendez_vous', (
            select count(*) from public.rendez_vous r
            where r.statut in ('demande', 'confirme', 'termine')
              and (r.debut at time zone v_tz)::date between p_du and p_au
          )
        )
        from public.villes v
        where v.nom = split_part(coalesce((select valeur #>> '{}' from public.parametres where cle = 'ville_salon'), 'Douala'), ',', 1)
        limit 1
      ),
      'pays', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', x.pays,
          'nom', coalesce((select pa.nom from public.pays pa where pa.code = x.pays), x.pays),
          'commandes', x.commandes, 'ca_fcfa', x.ca, 'villes', x.villes
        ) order by x.commandes desc, x.ca desc, (select pa.ordre from public.pays pa where pa.code = x.pays))
        from (
          select pays, sum(commandes)::integer as commandes, sum(ca)::integer as ca, count(*)::integer as villes
          from par_ville group by pays
        ) x
      ), '[]'::jsonb),
      'villes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pv.id, 'nom', pv.nom, 'pays', pv.pays, 'devise', pv.devise,
          'latitude', pv.latitude, 'longitude', pv.longitude,
          'commandes', pv.commandes, 'livrees', pv.livrees, 'en_cours', pv.en_cours,
          'a_confirmer', pv.a_confirmer, 'annulees', pv.annulees,
          'ca_fcfa', pv.ca, 'ventes', pv.ventes,
          'panier_moyen_fcfa', case when pv.ventes > 0 then round(pv.ca::numeric / pv.ventes)::integer end,
          'clientes', pv.clientes,
          'derniere_commande_at', pv.derniere,
          'produit_phare', (
            select jsonb_build_object('nom', private.nom_variante(cl.variante_id), 'quantite', sum(cl.quantite - cl.quantite_retournee))
            from ventes x join public.commande_lignes cl on cl.commande_id = x.id
            where x.ville_id = pv.id
            group by cl.variante_id
            order by sum(cl.quantite - cl.quantite_retournee) desc, private.nom_variante(cl.variante_id)
            limit 1
          ),
          'quartiers', coalesce((
            select jsonb_agg(q order by q.commandes desc, q.quartier) from (
              select initcap(lower(trim(l.quartier))) as quartier, count(distinct r.id)::integer as commandes
              from recues r
              join public.livraisons l on l.commande_id = r.id
              where r.ville_id = pv.id and r.statut <> 'annulee'
              group by 1
              order by 2 desc, 1
              limit 5
            ) q
          ), '[]'::jsonb)
        ) order by pv.ordre)
        from par_ville pv
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.carte_activite(date, date) from public, anon;
grant execute on function public.carte_activite(date, date) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to anon, authenticated;
