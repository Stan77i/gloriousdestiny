-- Glorious Destiny — promotions.
-- Une promotion porte sur un produit (tous ses formats) ou sur un format précis : un
-- pourcentage ou un prix promotionnel, une date de début et une date de fin facultative.
-- Le prix effectif est calculé par le serveur et appliqué à la commande : le prix affiché
-- est toujours celui facturé. L'ancien prix affiché est le prix réel du catalogue ; une
-- promotion qui ne baisse pas le prix n'est jamais affichée. Une promotion expirée ou
-- désactivée disparaît d'elle-même (aucune tâche à lancer).

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produits (id),
  variante_id uuid references public.variantes (id),
  mode text not null check (mode in ('pourcentage', 'prix')),
  valeur integer not null check (valeur > 0),
  debut timestamptz not null default now(),
  fin timestamptz,
  actif boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mode <> 'pourcentage' or valeur between 1 and 90),
  check (fin is null or fin > debut)
);
create index promotions_produit_idx on public.promotions (produit_id) where actif;
create index promotions_variante_idx on public.promotions (variante_id) where actif;

alter table public.promotions enable row level security;
revoke all on public.promotions from anon, authenticated;
grant select on public.promotions to authenticated;
create policy promotions_lecture_staff on public.promotions for select to authenticated
  using (private.est_staff());

create trigger promotions_audit after insert or update or delete on public.promotions
  for each row execute function private.journaliser();
create trigger promotions_updated_at before update on public.promotions
  for each row execute function private.set_updated_at();

-- Meilleure promotion en cours pour un format (la plus avantageuse pour la cliente).
create or replace function private.promotion_active(p_variante_id uuid)
returns table (promotion_id uuid, prix_base integer, prix_promo integer, fin timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select v.id, v.produit_id, coalesce(v.prix_fcfa, p.prix_fcfa) as prix
    from public.variantes v join public.produits p on p.id = v.produit_id
    where v.id = p_variante_id
  )
  select x.id, b.prix, x.prix_promo, x.fin
  from base b
  cross join lateral (
    select pr.id, pr.fin,
      case pr.mode
        when 'pourcentage' then round(b.prix * (100 - pr.valeur) / 100.0)::integer
        else pr.valeur
      end as prix_promo
    from public.promotions pr
    where pr.actif and pr.debut <= now() and (pr.fin is null or pr.fin > now())
      and pr.produit_id = b.produit_id and (pr.variante_id is null or pr.variante_id = b.id)
  ) x
  where x.prix_promo < b.prix and x.prix_promo > 0
  order by x.prix_promo, x.fin nulls last
  limit 1;
$$;

create or replace function private.prix_effectif(p_variante_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select prix_promo from private.promotion_active(p_variante_id)),
    (select coalesce(v.prix_fcfa, p.prix_fcfa) from public.variantes v
     join public.produits p on p.id = v.produit_id where v.id = p_variante_id)
  );
$$;

-- Promotions en cours sur le catalogue publié (lecture publique : ce sont des prix affichés).
create or replace function public.promotions_en_cours()
returns table (variante_id uuid, prix_base integer, prix_promo integer, reduction integer, fin timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, a.prix_base, a.prix_promo,
         round(100.0 * (a.prix_base - a.prix_promo) / a.prix_base)::integer, a.fin
  from public.variantes v
  join public.produits p on p.id = v.produit_id and p.publie and p.archive_at is null
  cross join lateral private.promotion_active(v.id) a
  where v.actif;
$$;
revoke all on function public.promotions_en_cours() from public;
grant execute on function public.promotions_en_cours() to anon, authenticated;

-- Administration : créer, modifier ou désactiver une promotion (propriétaire et admin).
create or replace function public.enregistrer_promotion(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_produit uuid := (p ->> 'produit_id')::uuid;
  v_variante uuid := nullif(p ->> 'variante_id', '')::uuid;
  v_mode text := p ->> 'mode';
  v_valeur integer := (p ->> 'valeur')::integer;
  v_debut timestamptz := coalesce(nullif(p ->> 'debut', '')::timestamptz, now());
  v_fin timestamptz := nullif(p ->> 'fin', '')::timestamptz;
  v_base integer;
begin
  if not private.a_role(array[]::text[]) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if v_mode not in ('pourcentage', 'prix') or v_valeur is null or v_valeur <= 0
     or (v_mode = 'pourcentage' and v_valeur > 90) or (v_fin is not null and v_fin <= v_debut) then
    raise exception 'VALIDATION: promotion' using errcode = '22023';
  end if;
  if v_variante is not null and not exists (
    select 1 from public.variantes where id = v_variante and produit_id = v_produit) then
    raise exception 'VALIDATION: format' using errcode = '22023';
  end if;
  -- Un prix promotionnel doit être inférieur au prix réel de chaque format concerné.
  if v_mode = 'prix' then
    select min(coalesce(v.prix_fcfa, pr.prix_fcfa)) into v_base
    from public.variantes v join public.produits pr on pr.id = v.produit_id
    where v.produit_id = v_produit and v.actif and (v_variante is null or v.id = v_variante);
    if v_base is null or v_valeur >= v_base then
      raise exception 'VALIDATION: le prix promotionnel doit être inférieur au prix actuel' using errcode = '22023';
    end if;
  end if;
  if v_id is null then
    insert into public.promotions (produit_id, variante_id, mode, valeur, debut, fin, created_by)
    values (v_produit, v_variante, v_mode, v_valeur, v_debut, v_fin, (select auth.uid()))
    returning id into v_id;
  else
    update public.promotions
    set variante_id = v_variante, mode = v_mode, valeur = v_valeur, debut = v_debut, fin = v_fin, actif = true
    where id = v_id and produit_id = v_produit;
    if not found then
      raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.desactiver_promotion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array[]::text[]) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.promotions set actif = false where id = p_id;
end;
$$;

revoke all on function public.enregistrer_promotion(jsonb), public.desactiver_promotion(uuid) from public, anon;
grant execute on function public.enregistrer_promotion(jsonb), public.desactiver_promotion(uuid) to authenticated;

-- La commande facture le prix effectif (promotion comprise), relu par le serveur.
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
      select v.id, p.nom, v.libelle, private.prix_effectif(v.id) as prix
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

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to authenticated, anon;
