-- Glorious Destiny — Phase 8 : livraison.
-- Tarifs et délais par ville, frais appliqués à la commande, statuts logistiques complets
-- (à préparer, en route, livrée, échec, nouvelle tentative, retour au salon, annulée),
-- adresse figée sur chaque tentative, retards, statistiques par ville et par produit.
-- Rien n'est effacé : chaque tentative reste une ligne, chaque décision une entrée d'historique.

-- ---------------------------------------------------------------------------
-- 1. Villes : frais, délais et mode de livraison (valeurs d'exemple à remplacer)
-- ---------------------------------------------------------------------------
alter table public.villes
  add column frais_livraison_fcfa integer not null default 0
    check (frais_livraison_fcfa between 0 and 200000),
  add column delai_min_jours smallint not null default 1 check (delai_min_jours between 0 and 60),
  add column delai_max_jours smallint not null default 3 check (delai_max_jours between 0 and 60),
  add column mode_livraison text not null default 'livreur'
    check (mode_livraison in ('livreur', 'agence', 'international')),
  add column precision_livraison text
    check (precision_livraison is null or length(precision_livraison) <= 300),
  add column tarif_exemple boolean not null default true,
  add constraint villes_delais_coherents check (delai_min_jours <= delai_max_jours);

comment on column public.villes.tarif_exemple is
  'Vrai tant que le tarif est une valeur d''exemple saisie au lancement (à confirmer par la boutique).';

-- Valeurs d'EXEMPLE (validées comme telles par la cliente le 11/11/2026), modifiables dans l'admin.
update public.villes set frais_livraison_fcfa = 1500, delai_min_jours = 0, delai_max_jours = 1,
  mode_livraison = 'livreur', precision_livraison = 'Livraison à domicile par notre livreur.'
  where nom = 'Douala';
update public.villes set frais_livraison_fcfa = 2500, delai_min_jours = 1, delai_max_jours = 2,
  mode_livraison = 'agence', precision_livraison = 'Envoi par agence de transport.'
  where nom = 'Yaoundé';
update public.villes set frais_livraison_fcfa = 4000, delai_min_jours = 2, delai_max_jours = 4,
  mode_livraison = 'agence', precision_livraison = 'Envoi par agence de transport.'
  where nom = 'Garoua';
update public.villes set frais_livraison_fcfa = 10000, delai_min_jours = 5, delai_max_jours = 10,
  mode_livraison = 'international', precision_livraison = 'Envoi international : délai confirmé sur WhatsApp.'
  where nom = 'Abidjan';

-- ---------------------------------------------------------------------------
-- 2. Livraisons : une ligne par tentative, adresse et frais figés
-- ---------------------------------------------------------------------------
alter table public.livraisons drop constraint livraisons_statut_check;
alter table public.livraisons add constraint livraisons_statut_check
  check (statut in ('a_preparer', 'expediee', 'livree', 'echec', 'retournee', 'annulee'));

alter table public.livraisons
  add column tentative smallint not null default 1 check (tentative between 1 and 10),
  add column frais_fcfa integer not null default 0 check (frais_fcfa >= 0),
  add column transporteur text check (transporteur is null or length(transporteur) <= 120),
  add column numero_suivi text check (numero_suivi is null or length(numero_suivi) <= 80),
  add column prevue_au date,
  add column cause_echec text
    check (cause_echec is null or cause_echec in ('absente', 'injoignable', 'refus', 'adresse', 'autre')),
  add column echec_at timestamptz,
  add column retournee_at timestamptz,
  add column annulee_at timestamptz,
  add constraint livraisons_tentative_unique unique (commande_id, tentative),
  add constraint livraisons_echec_date check (statut <> 'echec' or echec_at is not null),
  add constraint livraisons_annulation_date check (statut <> 'annulee' or annulee_at is not null),
  add constraint livraisons_retour_date check (statut <> 'retournee' or retournee_at is not null);

create index livraisons_echec_idx on public.livraisons (ville_id, echec_at) where echec_at is not null;
create index livraisons_en_route_idx on public.livraisons (prevue_au) where statut = 'expediee';

-- L'historique des commandes connaît les événements logistiques.
alter table public.commande_historique drop constraint commande_historique_evenement_check;
alter table public.commande_historique add constraint commande_historique_evenement_check
  check (evenement in (
    'creation', 'confirmation', 'annulation', 'expiration', 'expedition', 'livraison', 'paiement', 'note',
    'retour', 'echec_livraison', 'relivraison', 'frais_livraison'
  ));

-- Date d'arrivée au plus tard, dans le fuseau de la ville de livraison.
create or replace function private.date_prevue(p_ville_id smallint, p_depart timestamptz)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (p_depart at time zone v.fuseau)::date + v.delai_max_jours
  from public.villes v where v.id = p_ville_id;
$$;

-- Une commande entièrement retournée clôt sa livraison livrée.
create or replace function private.synchro_livraison_retour()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.livraisons set statut = 'retournee', retournee_at = now()
  where commande_id = new.id and statut = 'livree';
  return new;
end;
$$;
create trigger commandes_synchro_livraison_retour
  after update of statut on public.commandes
  for each row when (new.statut = 'retournee' and old.statut is distinct from 'retournee')
  execute function private.synchro_livraison_retour();

-- ---------------------------------------------------------------------------
-- 3. Résumé et message WhatsApp : frais et état de livraison
-- ---------------------------------------------------------------------------
create or replace function private.message_whatsapp(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select concat_ws(
    E'\n',
    'Bonjour Glorious Destiny,',
    'je confirme ma commande ' || o.reference || ' :',
    '',
    (
      select string_agg(
        '• ' || cl.nom_snapshot || ' × ' || cl.quantite || ' : ' || private.fcfa(cl.total_ligne_fcfa),
        E'\n' order by cl.nom_snapshot
      )
      from public.commande_lignes cl where cl.commande_id = o.id
    ),
    '',
    case when o.frais_livraison_fcfa > 0
      then 'Frais de livraison : ' || private.fcfa(o.frais_livraison_fcfa) end,
    'Total : ' || private.fcfa(o.total_fcfa) || ' (paiement à la livraison)',
    '',
    'Nom : ' || c.nom,
    'Téléphone : ' || c.telephone,
    'Livraison : ' || concat_ws(', ', l.adresse, l.quartier, v.nom),
    'Repère : ' || l.point_de_repere,
    '',
    'Merci de me confirmer la livraison.'
  )
  from public.commandes o
  join public.clientes c on c.id = o.cliente_id
  left join lateral (
    select * from public.livraisons x where x.commande_id = o.id order by x.tentative desc limit 1
  ) l on true
  left join public.villes v on v.id = l.ville_id
  where o.id = p_id;
$$;

create or replace function private.resume_commande(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'statut', o.statut,
    'statut_paiement', o.statut_paiement,
    'devise', o.devise,
    'sous_total_fcfa', o.sous_total_fcfa,
    'frais_livraison_fcfa', o.frais_livraison_fcfa,
    'total_fcfa', o.total_fcfa,
    'created_at', o.created_at,
    'reservation_expire_at', o.reservation_expire_at,
    'message_whatsapp', private.message_whatsapp(o.id),
    'message_whatsapp_ouvert_at', o.message_whatsapp_ouvert_at,
    'cliente', jsonb_build_object('nom', c.nom, 'telephone', c.telephone),
    'livraison', (
      select jsonb_build_object(
        'ville', v.nom, 'quartier', l.quartier, 'adresse', l.adresse,
        'point_de_repere', l.point_de_repere, 'telephone', l.telephone, 'statut', l.statut,
        'expediee_at', l.expediee_at, 'livree_at', l.livree_at,
        'tentative', l.tentative, 'prevue_au', l.prevue_au, 'echec_at', l.echec_at,
        'delai_min_jours', v.delai_min_jours, 'delai_max_jours', v.delai_max_jours
      )
      from public.livraisons l join public.villes v on v.id = l.ville_id
      where l.commande_id = o.id
      order by l.tentative desc
      limit 1
    ),
    'lignes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variante_id', cl.variante_id, 'nom', cl.nom_snapshot, 'quantite', cl.quantite,
        'prix_unitaire_fcfa', cl.prix_unitaire_snapshot_fcfa, 'total_fcfa', cl.total_ligne_fcfa
      ) order by cl.nom_snapshot)
      from public.commande_lignes cl where cl.commande_id = o.id
    ), '[]'::jsonb)
  )
  from public.commandes o join public.clientes c on c.id = o.cliente_id
  where o.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- 4. Création de commande : les frais de la ville sont appliqués par le serveur
-- ---------------------------------------------------------------------------
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
  if not (
    v_tel ~ '^\+[0-9]+$'
    and left(v_tel, length(v_ville.indicatif)) = v_ville.indicatif
    and length(v_tel) = length(v_ville.indicatif) + case v_ville.indicatif when '+237' then 9 else 10 end
  ) then
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
    v_commande_id, v_reference, v_cliente_id, v_ville.id, v_ville.devise, 'whatsapp', 'nouvelle',
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

  -- Frais de livraison : tarif de la ville au moment de la commande (figé ensuite).
  update public.commandes
  set sous_total_fcfa = v_sous_total,
      frais_livraison_fcfa = v_ville.frais_livraison_fcfa,
      total_fcfa = v_sous_total + v_ville.frais_livraison_fcfa
  where id = v_commande_id;

  insert into public.livraisons (commande_id, ville_id, quartier, adresse, point_de_repere, telephone, frais_fcfa)
  values (v_commande_id, v_ville.id, v_quartier, v_rue, v_repere, v_tel, v_ville.frais_livraison_fcfa);

  perform private.journal_commande(v_commande_id, 'creation', null, 'nouvelle');
  return private.resume_commande(v_commande_id);
end;
$$;
revoke all on function public.creer_commande(jsonb) from public;
grant execute on function public.creer_commande(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Annulation : la livraison à préparer est annulée (et non comptée en échec)
-- ---------------------------------------------------------------------------
create or replace function private.annuler(p_id uuid, p_motif text, p_evenement text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.commandes := private.commande_verrouillee(p_id);
begin
  if v.statut not in ('nouvelle', 'confirmee') then
    raise exception 'TRANSITION_IMPOSSIBLE: une commande % ne peut pas être annulée', v.statut using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_motif, ''))) = 0 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  perform private.liberer_reservation(p_id);
  update public.commandes
  set statut = 'annulee', annulee_at = now(), motif_annulation = trim(p_motif), reservation_expire_at = null
  where id = p_id;
  update public.livraisons
  set statut = 'annulee', annulee_at = now()
  where commande_id = p_id and statut = 'a_preparer';
  perform private.journal_commande(p_id, p_evenement, v.statut, 'annulee', p_motif);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Expédition (transporteur et numéro de suivi facultatifs) et livraison
-- ---------------------------------------------------------------------------
drop function public.expedier_commande(uuid);
create function public.expedier_commande(p_id uuid, p_transporteur text default null, p_suivi text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  l record;
  v_transporteur text := nullif(trim(coalesce(p_transporteur, '')), '');
  v_suivi text := nullif(trim(coalesce(p_suivi, '')), '');
begin
  if not private.a_role(array['logistique', 'ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(coalesce(v_transporteur, '')) > 120 or length(coalesce(v_suivi, '')) > 80 then
    raise exception 'VALIDATION: transporteur' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut <> 'confirmee' then
    raise exception 'TRANSITION_IMPOSSIBLE: seule une commande confirmée peut être expédiée' using errcode = 'P0001';
  end if;
  -- Sortie physique réelle : le stock réservé devient vendu (section G).
  for l in select variante_id, quantite from public.commande_lignes where commande_id = p_id order by variante_id loop
    perform private.appliquer_mouvement_stock(
      l.variante_id, 'vente', -l.quantite, -l.quantite, 'commande', p_id, null,
      'vente:' || p_id || ':' || l.variante_id
    );
  end loop;
  update public.commandes set statut = 'expediee' where id = p_id;
  update public.livraisons
  set statut = 'expediee', expediee_at = now(), transporteur = v_transporteur, numero_suivi = v_suivi,
      prevue_au = private.date_prevue(ville_id, now())
  where commande_id = p_id and statut = 'a_preparer';
  perform private.journal_commande(
    p_id, 'expedition', 'confirmee', 'expediee',
    nullif(concat_ws(' · ', v_transporteur, 'suivi ' || v_suivi), '')
  );
  return private.resume_commande(p_id);
end;
$$;

create or replace function public.livrer_commande(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  l record;
begin
  if not private.a_role(array['logistique', 'ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut <> 'expediee' then
    raise exception 'TRANSITION_IMPOSSIBLE: seule une commande expédiée peut être livrée' using errcode = 'P0001';
  end if;
  -- Après un échec, il faut d'abord relancer une tentative.
  if not exists (select 1 from public.livraisons where commande_id = p_id and statut = 'expediee') then
    raise exception 'TRANSITION_IMPOSSIBLE: aucun colis en route pour cette commande' using errcode = 'P0001';
  end if;
  -- Événement tracé dans le journal de stock, sans effet sur les quantités (section G).
  for l in select variante_id from public.commande_lignes where commande_id = p_id order by variante_id loop
    perform private.appliquer_mouvement_stock(
      l.variante_id, 'livraison', 0, 0, 'commande', p_id, null, 'livraison:' || p_id || ':' || l.variante_id
    );
  end loop;
  update public.commandes set statut = 'livree' where id = p_id;
  update public.livraisons set statut = 'livree', livree_at = now()
  where commande_id = p_id and statut = 'expediee';
  perform private.journal_commande(p_id, 'livraison', 'expediee', 'livree');
  return private.resume_commande(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Échec, nouvelle tentative, retour du colis au salon
-- ---------------------------------------------------------------------------
create or replace function public.signaler_echec_livraison(p_id uuid, p_cause text, p_precision text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  v_precision text := nullif(trim(coalesce(p_precision, '')), '');
  v_motif text;
begin
  if not private.a_role(array['logistique', 'ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_cause is null or p_cause not in ('absente', 'injoignable', 'refus', 'adresse', 'autre') then
    raise exception 'VALIDATION: cause' using errcode = '22023';
  end if;
  if (p_cause = 'autre' and length(coalesce(v_precision, '')) < 3) or length(coalesce(v_precision, '')) > 300 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut <> 'expediee'
     or not exists (select 1 from public.livraisons where commande_id = p_id and statut = 'expediee') then
    raise exception 'TRANSITION_IMPOSSIBLE: aucun colis en route pour cette commande' using errcode = 'P0001';
  end if;
  v_motif := concat_ws(' : ',
    case p_cause
      when 'absente' then 'Cliente absente'
      when 'injoignable' then 'Cliente injoignable'
      when 'refus' then 'Colis refusé'
      when 'adresse' then 'Adresse introuvable'
      else 'Autre'
    end,
    v_precision);
  update public.livraisons
  set statut = 'echec', echec_at = now(), cause_echec = p_cause, motif_echec = v_motif
  where commande_id = p_id and statut = 'expediee';
  perform private.journal_commande(p_id, 'echec_livraison', 'expediee', 'expediee', v_motif);
  return private.resume_commande(p_id);
end;
$$;

-- Nouvelle tentative après un échec : nouvelle ligne de livraison, adresse éventuellement corrigée
-- (la ville ne change pas : elle fixe la devise et les frais).
create or replace function public.relancer_livraison(
  p_id uuid, p_adresse jsonb default null, p_transporteur text default null, p_suivi text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  p public.livraisons;
  a jsonb := coalesce(p_adresse, '{}'::jsonb);
  v_quartier text;
  v_repere text;
  v_rue text;
  v_tel text;
  v_ville public.villes;
  v_transporteur text := nullif(trim(coalesce(p_transporteur, '')), '');
  v_suivi text := nullif(trim(coalesce(p_suivi, '')), '');
begin
  if not private.a_role(array['logistique', 'ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  v := private.commande_verrouillee(p_id);
  select * into p from public.livraisons where commande_id = p_id order by tentative desc limit 1;
  if v.statut <> 'expediee' or p.statut is distinct from 'echec' then
    raise exception 'TRANSITION_IMPOSSIBLE: seule une livraison en échec peut être relancée' using errcode = 'P0001';
  end if;
  if p.tentative >= 5 then
    raise exception 'TRANSITION_IMPOSSIBLE: 5 tentatives déjà faites, rapatriez le colis' using errcode = 'P0001';
  end if;
  select * into v_ville from public.villes where id = p.ville_id;
  v_quartier := coalesce(nullif(trim(a ->> 'quartier'), ''), p.quartier);
  v_repere := coalesce(nullif(trim(a ->> 'point_de_repere'), ''), p.point_de_repere);
  v_rue := case when a ? 'adresse' then nullif(trim(a ->> 'adresse'), '') else p.adresse end;
  v_tel := coalesce(nullif(trim(a ->> 'telephone'), ''), p.telephone);
  if length(v_quartier) > 120 or length(v_repere) > 300 or length(coalesce(v_rue, '')) > 300
     or length(coalesce(v_transporteur, '')) > 120 or length(coalesce(v_suivi, '')) > 80 then
    raise exception 'VALIDATION: adresse' using errcode = '22023';
  end if;
  if not (
    v_tel ~ '^\+[0-9]+$'
    and left(v_tel, length(v_ville.indicatif)) = v_ville.indicatif
    and length(v_tel) = length(v_ville.indicatif) + case v_ville.indicatif when '+237' then 9 else 10 end
  ) then
    raise exception 'VALIDATION: telephone' using errcode = '22023';
  end if;

  insert into public.livraisons (
    commande_id, ville_id, quartier, adresse, point_de_repere, telephone, statut, tentative,
    frais_fcfa, transporteur, numero_suivi, expediee_at, prevue_au
  )
  values (
    p_id, p.ville_id, v_quartier, v_rue, v_repere, v_tel, 'expediee', p.tentative + 1,
    p.frais_fcfa, coalesce(v_transporteur, p.transporteur), v_suivi, now(), private.date_prevue(p.ville_id, now())
  );
  perform private.journal_commande(
    p_id, 'relivraison', 'expediee', 'expediee', 'Tentative ' || (p.tentative + 1)
  );
  return private.resume_commande(p_id);
end;
$$;

-- Le colis non livré revient au salon : il rentre en stock (mouvement « retour »), la commande
-- est close comme retournée. Rien n'est effacé.
create or replace function public.rapatrier_colis(p_id uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  p public.livraisons;
  l record;
begin
  if not private.a_role(array['logistique', 'ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 or length(p_motif) > 300 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  select * into p from public.livraisons where commande_id = p_id order by tentative desc limit 1;
  if v.statut <> 'expediee' or p.statut is distinct from 'echec' then
    raise exception 'TRANSITION_IMPOSSIBLE: seul un colis en échec de livraison peut revenir au salon' using errcode = 'P0001';
  end if;
  for l in
    select id, variante_id, quantite - quantite_retournee as reste
    from public.commande_lignes where commande_id = p_id and quantite_retournee < quantite
    order by variante_id
  loop
    perform private.appliquer_mouvement_stock(
      l.variante_id, 'retour', l.reste, 0, 'commande', p_id, 'Colis non livré revenu au salon',
      'rapatriement:' || p_id || ':' || l.variante_id
    );
    update public.commande_lignes set quantite_retournee = quantite where id = l.id;
  end loop;
  update public.livraisons set statut = 'retournee', retournee_at = now() where id = p.id;
  update public.commandes set statut = 'retournee' where id = p_id;
  perform private.journal_commande(
    p_id, 'retour', 'expediee', 'retournee', 'Colis non livré revenu au salon : ' || trim(p_motif)
  );
  return private.resume_commande(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Ajustement des frais d'une commande (cas particulier convenu sur WhatsApp)
-- ---------------------------------------------------------------------------
create or replace function public.ajuster_frais_livraison(p_id uuid, p_frais_fcfa integer, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v public.commandes;
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_frais_fcfa is null or p_frais_fcfa not between 0 and 200000 then
    raise exception 'VALIDATION: frais' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 or length(p_motif) > 300 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut not in ('nouvelle', 'confirmee', 'expediee') or v.statut_paiement <> 'non_paye' then
    raise exception 'TRANSITION_IMPOSSIBLE: frais modifiables seulement avant livraison et paiement' using errcode = 'P0001';
  end if;
  if p_frais_fcfa = v.frais_livraison_fcfa then
    return private.resume_commande(p_id);
  end if;
  update public.commandes
  set frais_livraison_fcfa = p_frais_fcfa, total_fcfa = sous_total_fcfa + p_frais_fcfa
  where id = p_id;
  update public.livraisons set frais_fcfa = p_frais_fcfa
  where id = (select id from public.livraisons where commande_id = p_id order by tentative desc limit 1);
  perform private.journal_commande(
    p_id, 'frais_livraison', v.statut, v.statut,
    private.fcfa(v.frais_livraison_fcfa) || ' → ' || private.fcfa(p_frais_fcfa) || ' : ' || trim(p_motif)
  );
  return private.resume_commande(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Tarifs par ville (administration)
-- ---------------------------------------------------------------------------
create or replace function public.regler_livraison_ville(
  p_ville_id smallint, p_frais_fcfa integer, p_delai_min integer, p_delai_max integer,
  p_mode text, p_precision text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['admin']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_frais_fcfa is null or p_frais_fcfa not between 0 and 200000
     or p_delai_min is null or p_delai_max is null
     or p_delai_min not between 0 and 60 or p_delai_max not between 0 and 60 or p_delai_min > p_delai_max
     or p_mode not in ('livreur', 'agence', 'international')
     or length(coalesce(p_precision, '')) > 300 then
    raise exception 'VALIDATION: tarif' using errcode = '22023';
  end if;
  update public.villes
  set frais_livraison_fcfa = p_frais_fcfa, delai_min_jours = p_delai_min, delai_max_jours = p_delai_max,
      mode_livraison = p_mode, precision_livraison = nullif(trim(coalesce(p_precision, '')), ''),
      tarif_exemple = false
  where id = p_ville_id;
  if not found then
    raise exception 'VALIDATION: ville' using errcode = '22023';
  end if;
  insert into public.audit_logs (auteur_id, action, entite, entite_id, apres)
  values ((select auth.uid()), 'tarif_livraison', 'villes', p_ville_id::text, jsonb_build_object(
    'frais_fcfa', p_frais_fcfa, 'delai_min', p_delai_min, 'delai_max', p_delai_max, 'mode', p_mode
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Vue de pilotage des livraisons (droits de l'appelant : RLS des tables)
-- ---------------------------------------------------------------------------
create view public.vue_livraisons
with (security_invoker = true)
as
select
  l.id,
  l.commande_id,
  o.reference,
  o.statut as statut_commande,
  o.statut_paiement,
  o.total_fcfa,
  o.devise,
  c.nom as cliente,
  l.telephone,
  l.ville_id,
  v.nom as ville,
  l.quartier,
  l.adresse,
  l.point_de_repere,
  l.statut,
  l.tentative,
  l.frais_fcfa,
  l.transporteur,
  l.numero_suivi,
  l.prevue_au,
  l.cause_echec,
  l.motif_echec,
  l.expediee_at,
  l.livree_at,
  l.echec_at,
  l.retournee_at,
  l.annulee_at,
  l.created_at,
  l.tentative = max(l.tentative) over (partition by l.commande_id) as derniere,
  case
    when l.statut = 'a_preparer' and o.statut = 'nouvelle' then 'a_confirmer'
    when l.statut = 'a_preparer' then 'a_preparer'
    when l.statut = 'expediee' and (now() at time zone v.fuseau)::date > l.prevue_au then 'en_retard'
    when l.statut = 'expediee' then 'en_route'
    when l.statut = 'echec' and o.statut = 'expediee'
      and l.tentative = max(l.tentative) over (partition by l.commande_id) then 'echec'
    when l.statut = 'echec' then 'echec_passe'
    else l.statut
  end as etape,
  (
    select string_agg(cl.nom_snapshot || ' × ' || cl.quantite, ', ' order by cl.nom_snapshot)
    from public.commande_lignes cl where cl.commande_id = l.commande_id
  ) as articles
from public.livraisons l
join public.commandes o on o.id = l.commande_id
join public.clientes c on c.id = o.cliente_id
join public.villes v on v.id = l.ville_id;

grant select on public.vue_livraisons to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Statistiques : par ville, par produit et ville, causes d'échec
-- Les dates sont comptées dans le fuseau de la ville de livraison.
-- ---------------------------------------------------------------------------
create or replace function public.statistiques_livraison(p_du date, p_au date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes', 'logistique']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_du is null or p_au is null or p_du > p_au or p_au - p_du > 400 then
    raise exception 'VALIDATION: periode' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'du', p_du,
    'au', p_au,
    'par_ville', coalesce((
      select jsonb_agg(x order by x.ordre) from (
        select
          v.id as ville_id, v.nom as ville, v.ordre,
          count(*) filter (
            where l.livree_at is not null and (l.livree_at at time zone v.fuseau)::date between p_du and p_au
          ) as livrees,
          count(*) filter (
            where l.echec_at is not null and (l.echec_at at time zone v.fuseau)::date between p_du and p_au
          ) as echecs,
          count(*) filter (where l.statut = 'expediee') as en_route,
          count(*) filter (
            where l.statut = 'expediee' and (now() at time zone v.fuseau)::date > l.prevue_au
          ) as en_retard,
          round(avg(extract(epoch from l.livree_at - l.expediee_at) / 3600.0) filter (
            where l.livree_at is not null and (l.livree_at at time zone v.fuseau)::date between p_du and p_au
          ))::integer as delai_moyen_heures
        from public.villes v
        left join public.livraisons l on l.ville_id = v.id
        where v.actif
        group by v.id, v.nom, v.ordre
      ) x
    ), '[]'::jsonb),
    'par_produit', coalesce((
      select jsonb_agg(x order by x.ville_ordre, x.quantite_livree desc, x.produit) from (
        select
          p.id as produit_id, p.nom as produit, va.id as variante_id, va.libelle as variante,
          v.id as ville_id, v.nom as ville, v.ordre as ville_ordre,
          sum(cl.quantite)::integer as quantite_livree,
          sum(cl.quantite_retournee)::integer as quantite_retournee,
          count(distinct l.commande_id)::integer as commandes
        from public.livraisons l
        join public.villes v on v.id = l.ville_id
        join public.commande_lignes cl on cl.commande_id = l.commande_id
        join public.variantes va on va.id = cl.variante_id
        join public.produits p on p.id = va.produit_id
        where l.livree_at is not null
          and (l.livree_at at time zone v.fuseau)::date between p_du and p_au
        group by p.id, p.nom, va.id, va.libelle, v.id, v.nom, v.ordre
      ) x
    ), '[]'::jsonb),
    'causes_echec', coalesce((
      select jsonb_agg(x order by x.nombre desc) from (
        select l.cause_echec as cause, count(*)::integer as nombre
        from public.livraisons l join public.villes v on v.id = l.ville_id
        where l.echec_at is not null and (l.echec_at at time zone v.fuseau)::date between p_du and p_au
        group by l.cause_echec
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'expedier_commande(uuid, text, text)', 'livrer_commande(uuid)',
    'signaler_echec_livraison(uuid, text, text)', 'relancer_livraison(uuid, jsonb, text, text)',
    'rapatrier_colis(uuid, text)', 'ajuster_frais_livraison(uuid, integer, text)',
    'regler_livraison_ville(smallint, integer, integer, integer, text, text)',
    'statistiques_livraison(date, date)'
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
