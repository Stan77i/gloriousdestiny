-- Glorious Destiny — Phase 5 : commerce.
-- Création atomique des commandes (sections E7, G, H), transitions de statut,
-- encaissement à la livraison, historique, expiration automatique des réservations.
-- Toute écriture passe par ces fonctions ; aucune table commerciale n'est modifiable
-- directement depuis l'API.

-- ---------------------------------------------------------------------------
-- Historique des commandes (lisible par l'équipe, contrairement à l'audit)
-- ---------------------------------------------------------------------------
create table public.commande_historique (
  id bigint generated always as identity primary key,
  commande_id uuid not null references public.commandes (id),
  evenement text not null check (evenement in (
    'creation', 'confirmation', 'annulation', 'expiration', 'expedition', 'livraison', 'paiement', 'note'
  )),
  statut_avant text,
  statut_apres text not null,
  motif text,
  auteur_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index commande_historique_commande_idx on public.commande_historique (commande_id, created_at);
create index commande_historique_auteur_idx on public.commande_historique (auteur_id);
create trigger commande_historique_immuable
  before update or delete on public.commande_historique
  for each row execute function private.interdire_modification();

alter table public.commande_historique enable row level security;
revoke all on public.commande_historique from anon, authenticated;
grant select on public.commande_historique to authenticated;
create policy commande_historique_lecture on public.commande_historique for select to authenticated
  using (
    (select private.a_role(array['ventes', 'logistique']))
    or exists (
      select 1 from public.commandes o join public.clientes c on c.id = o.cliente_id
      where o.id = commande_id and c.auth_user_id = (select auth.uid())
    )
  );

create or replace function private.journal_commande(
  p_commande_id uuid, p_evenement text, p_avant text, p_apres text, p_motif text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.commande_historique (commande_id, evenement, statut_avant, statut_apres, motif, auteur_id)
  values (p_commande_id, p_evenement, p_avant, p_apres, nullif(trim(p_motif), ''), (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Résumé d'une commande (réponse des fonctions publiques et du suivi)
-- ---------------------------------------------------------------------------
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
    'cliente', jsonb_build_object('nom', c.nom, 'telephone', c.telephone),
    'livraison', (
      select jsonb_build_object(
        'ville', v.nom, 'quartier', l.quartier, 'adresse', l.adresse,
        'point_de_repere', l.point_de_repere, 'telephone', l.telephone, 'statut', l.statut,
        'expediee_at', l.expediee_at, 'livree_at', l.livree_at
      )
      from public.livraisons l join public.villes v on v.id = l.ville_id
      where l.commande_id = o.id
      order by l.created_at desc
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
-- Création d'une commande (site public, sans compte)
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

-- Suivi public : la référence seule ne suffit pas, il faut aussi le téléphone.
create or replace function public.suivre_commande(p_reference text, p_telephone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.resume_commande(o.id)
  from public.commandes o join public.clientes c on c.id = o.cliente_id
  where o.reference = upper(trim(p_reference)) and c.telephone = trim(p_telephone);
$$;
revoke all on function public.suivre_commande(text, text) from public;
grant execute on function public.suivre_commande(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Transitions réservées à l'équipe
-- ---------------------------------------------------------------------------
create or replace function private.commande_verrouillee(p_id uuid)
returns public.commandes
language plpgsql
security definer
set search_path = ''
as $$
declare v public.commandes;
begin
  select * into v from public.commandes where id = p_id for update;
  if not found then
    raise exception 'COMMANDE_INTROUVABLE' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Libère la réservation de chaque ligne (annulation ou expiration).
create or replace function private.liberer_reservation(p_commande_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare l record;
begin
  for l in select variante_id, quantite from public.commande_lignes
           where commande_id = p_commande_id order by variante_id
  loop
    perform private.appliquer_mouvement_stock(
      l.variante_id, 'annulation_reservation', 0, -l.quantite, 'commande', p_commande_id, null,
      'liberation:' || p_commande_id || ':' || l.variante_id
    );
  end loop;
end;
$$;

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
  set statut = 'echec', motif_echec = 'Commande annulée : ' || trim(p_motif)
  where commande_id = p_id and statut = 'a_preparer';
  perform private.journal_commande(p_id, p_evenement, v.statut, 'annulee', p_motif);
end;
$$;

create or replace function public.confirmer_commande(p_id uuid)
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
  v := private.commande_verrouillee(p_id);
  if v.statut <> 'nouvelle' then
    raise exception 'TRANSITION_IMPOSSIBLE: commande déjà %', v.statut using errcode = 'P0001';
  end if;
  update public.commandes
  set statut = 'confirmee', confirmee_at = now(), reservation_expire_at = null
  where id = p_id;
  perform private.journal_commande(p_id, 'confirmation', 'nouvelle', 'confirmee');
  return private.resume_commande(p_id);
end;
$$;

create or replace function public.annuler_commande(p_id uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  perform private.annuler(p_id, p_motif, 'annulation');
  return private.resume_commande(p_id);
end;
$$;

-- Expédition = sortie physique réelle : le stock réservé devient vendu (section G).
create or replace function public.expedier_commande(p_id uuid)
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
  if v.statut <> 'confirmee' then
    raise exception 'TRANSITION_IMPOSSIBLE: seule une commande confirmée peut être expédiée' using errcode = 'P0001';
  end if;
  for l in select variante_id, quantite from public.commande_lignes where commande_id = p_id order by variante_id loop
    perform private.appliquer_mouvement_stock(
      l.variante_id, 'vente', -l.quantite, -l.quantite, 'commande', p_id, null,
      'vente:' || p_id || ':' || l.variante_id
    );
  end loop;
  update public.commandes set statut = 'expediee' where id = p_id;
  update public.livraisons set statut = 'expediee', expediee_at = now()
  where commande_id = p_id and statut = 'a_preparer';
  perform private.journal_commande(p_id, 'expedition', 'confirmee', 'expediee');
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

create or replace function public.enregistrer_paiement(
  p_id uuid, p_mode text, p_montant_fcfa integer, p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v public.commandes;
begin
  if not private.a_role(array['ventes', 'logistique']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut in ('nouvelle', 'annulee') then
    raise exception 'TRANSITION_IMPOSSIBLE: commande % : encaissement impossible', v.statut using errcode = 'P0001';
  end if;
  if v.statut_paiement <> 'non_paye' then
    raise exception 'TRANSITION_IMPOSSIBLE: paiement déjà enregistré' using errcode = 'P0001';
  end if;
  if p_mode not in ('especes', 'mobile_money') or p_montant_fcfa is null or p_montant_fcfa <= 0 then
    raise exception 'VALIDATION: paiement' using errcode = '22023';
  end if;
  if p_mode = 'mobile_money' and length(trim(coalesce(p_reference, ''))) = 0 then
    raise exception 'VALIDATION: reference_paiement' using errcode = '22023';
  end if;
  update public.commandes
  set statut_paiement = 'paye', mode_paiement = p_mode, montant_encaisse_fcfa = p_montant_fcfa,
      reference_paiement = nullif(trim(p_reference), ''), paye_at = now(), encaisse_par = (select auth.uid())
  where id = p_id;
  perform private.journal_commande(
    p_id, 'paiement', v.statut, v.statut,
    case p_mode when 'especes' then 'Espèces' else 'Mobile Money' end || ' · ' || p_montant_fcfa || ' FCFA'
  );
  return private.resume_commande(p_id);
end;
$$;

create or replace function public.annoter_commande(p_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.commandes;
begin
  if not private.a_role(array['ventes', 'logistique']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(coalesce(p_notes, '')) > 2000 then
    raise exception 'VALIDATION: notes' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  update public.commandes set notes_internes = nullif(trim(p_notes), '') where id = p_id;
  perform private.journal_commande(p_id, 'note', v.statut, v.statut, 'Notes internes modifiées');
end;
$$;

create or replace function public.annoter_cliente(p_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['ventes']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(coalesce(p_notes, '')) > 2000 then
    raise exception 'VALIDATION: notes' using errcode = '22023';
  end if;
  update public.clientes set notes_internes = nullif(trim(p_notes), '') where id = p_id;
  if not found then
    raise exception 'CLIENTE_INTROUVABLE' using errcode = 'P0002';
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.confirmer_commande(uuid)', 'public.annuler_commande(uuid, text)',
    'public.expedier_commande(uuid)', 'public.livrer_commande(uuid)',
    'public.enregistrer_paiement(uuid, text, integer, text)',
    'public.annoter_commande(uuid, text)', 'public.annoter_cliente(uuid, text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Expiration automatique des commandes non confirmées (stock libéré)
-- ---------------------------------------------------------------------------
create or replace function private.expirer_commandes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nb integer := 0;
begin
  for v_id in
    select id from public.commandes
    where statut = 'nouvelle' and reservation_expire_at < now()
    order by reservation_expire_at
    for update skip locked
  loop
    perform private.annuler(v_id, 'Expiration automatique : commande non confirmée dans le délai', 'expiration');
    v_nb := v_nb + 1;
  end loop;
  return v_nb;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel() to authenticated, anon;

-- Planification toutes les 15 minutes, si pg_cron est disponible (Supabase).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('gd-expirer-commandes', '*/15 * * * *', 'select private.expirer_commandes()');
  end if;
end;
$$;
