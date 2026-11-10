-- Glorious Destiny — Phase 7 : gestion du stock (architecture, section G).
-- Toutes les opérations passent par private.appliquer_mouvement_stock : aucune quantité
-- ne change sans mouvement, chaque mouvement porte son auteur, sa référence et son motif.

-- ---------------------------------------------------------------------------
-- Paramètre : écart d'inventaire au-delà duquel seul admin/owner peut corriger
-- ---------------------------------------------------------------------------
insert into public.parametres (cle, valeur, public)
values ('seuil_double_validation_inventaire', to_jsonb(10), false)
on conflict (cle) do nothing;

-- L'historique des commandes connaît désormais les retours.
alter table public.commande_historique drop constraint commande_historique_evenement_check;
alter table public.commande_historique add constraint commande_historique_evenement_check
  check (evenement in (
    'creation', 'confirmation', 'annulation', 'expiration', 'expedition', 'livraison', 'paiement', 'note', 'retour'
  ));

-- ---------------------------------------------------------------------------
-- Vue de pilotage du stock (droits de l'appelant : réservée au personnel par la RLS)
-- ---------------------------------------------------------------------------
create view public.vue_stock
with (security_invoker = true)
as
select
  v.id as variante_id,
  v.sku,
  v.libelle,
  p.id as produit_id,
  p.nom as produit,
  p.slug,
  c.nom as categorie,
  p.publie,
  p.seuil_alerte,
  p.delai_appro_jours,
  p.stock_securite_jours,
  coalesce(s.physique, 0) as physique,
  coalesce(s.reserve, 0) as reserve,
  coalesce(s.disponible, 0) as disponible,
  case
    when coalesce(s.disponible, 0) <= 0 then 'epuise'
    when coalesce(s.disponible, 0) <= p.seuil_alerte then 'bientot_epuise'
    else 'disponible'
  end as statut,
  s.updated_at as mis_a_jour_le
from public.variantes v
join public.produits p on p.id = v.produit_id
join public.categories c on c.id = p.categorie_id
left join public.stocks s on s.variante_id = v.id and s.emplacement_id = private.emplacement_principal()
where v.actif and p.archive_at is null;

grant select on public.vue_stock to authenticated;
grant execute on function private.emplacement_principal() to authenticated;

-- ---------------------------------------------------------------------------
-- Réception fournisseur : une réception, ses lignes, une entrée par ligne
-- ---------------------------------------------------------------------------
create or replace function public.receptionner(p_reception jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cle text := p_reception ->> 'cle_idempotence';
  v_fournisseur uuid;
  v_id uuid;
  v_ligne record;
  v_cout integer;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant de réception' using errcode = '22023';
  end if;
  -- Idempotence : la réception déjà enregistrée sous cette clé est renvoyée.
  select reference_id into v_id from public.mouvements_stock
  where cle_idempotence = v_cle || ':1' and reference_type = 'reception';
  if found then
    return v_id;
  end if;
  if jsonb_typeof(p_reception -> 'lignes') is distinct from 'array'
     or jsonb_array_length(p_reception -> 'lignes') not between 1 and 50 then
    raise exception 'VALIDATION: lignes' using errcode = '22023';
  end if;
  begin
    v_fournisseur := nullif(p_reception ->> 'fournisseur_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'VALIDATION: fournisseur' using errcode = '22023';
  end;
  if v_fournisseur is not null and not exists (select 1 from public.fournisseurs where id = v_fournisseur) then
    raise exception 'VALIDATION: fournisseur' using errcode = '22023';
  end if;

  insert into public.receptions (fournisseur_id, reference_fournisseur, date_reception, auteur_id)
  values (
    v_fournisseur,
    nullif(trim(coalesce(p_reception ->> 'reference_fournisseur', '')), ''),
    coalesce((p_reception ->> 'date_reception')::date, current_date),
    (select auth.uid())
  )
  returning id into v_id;

  for v_ligne in
    select row_number() over (order by x ->> 'variante_id') as n,
           (x ->> 'variante_id') as variante_id,
           (x ->> 'quantite') as quantite,
           (x ->> 'cout_unitaire_fcfa') as cout
    from jsonb_array_elements(p_reception -> 'lignes') x
    order by x ->> 'variante_id'
  loop
    begin
      if v_ligne.quantite::integer not between 1 and 100000 then
        raise exception 'VALIDATION: quantite' using errcode = '22023';
      end if;
      v_cout := nullif(v_ligne.cout, '')::integer;
      if v_cout is not null and v_cout < 0 then
        raise exception 'VALIDATION: cout' using errcode = '22023';
      end if;
      if not exists (select 1 from public.variantes where id = v_ligne.variante_id::uuid) then
        raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
      end if;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'VALIDATION: ligne' using errcode = '22023';
    end;
    insert into public.reception_lignes (reception_id, variante_id, quantite, cout_unitaire_fcfa)
    values (v_id, v_ligne.variante_id::uuid, v_ligne.quantite::integer, v_cout);
    perform private.appliquer_mouvement_stock(
      v_ligne.variante_id::uuid, 'entree', v_ligne.quantite::integer, 0, 'reception', v_id,
      'Réception fournisseur', v_cle || ':' || v_ligne.n
    );
  end loop;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perte, casse, péremption : jamais sur du stock réservé
-- ---------------------------------------------------------------------------
create or replace function public.declarer_perte(
  p_variante_id uuid, p_quantite integer, p_motif text, p_cle_idempotence text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_quantite is null or p_quantite <= 0 then
    raise exception 'VALIDATION: quantite' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  return private.appliquer_mouvement_stock(
    p_variante_id, 'perte', -p_quantite, 0, 'manuel', null, p_motif, p_cle_idempotence
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Correction d'inventaire : on saisit le comptage réel, l'écart devient un mouvement.
-- Au-delà du seuil, seul admin/owner valide (double validation).
-- ---------------------------------------------------------------------------
create or replace function public.corriger_inventaire(
  p_variante_id uuid, p_quantite_comptee integer, p_motif text, p_cle_idempotence text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_physique integer;
  v_ecart integer;
  v_seuil integer;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_quantite_comptee is null or p_quantite_comptee < 0 then
    raise exception 'VALIDATION: quantite' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  if exists (select 1 from public.mouvements_stock where cle_idempotence = p_cle_idempotence) then
    return 0;
  end if;

  insert into public.stocks (variante_id, emplacement_id)
  values (p_variante_id, private.emplacement_principal())
  on conflict do nothing;
  select physique into v_physique from public.stocks
  where variante_id = p_variante_id and emplacement_id = private.emplacement_principal()
  for update;
  if not found then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;

  v_ecart := p_quantite_comptee - v_physique;
  if v_ecart = 0 then
    return 0;
  end if;
  select coalesce((valeur #>> '{}')::integer, 10) into v_seuil
  from public.parametres where cle = 'seuil_double_validation_inventaire';
  if abs(v_ecart) > coalesce(v_seuil, 10) and private.role_actuel() not in ('owner', 'admin') then
    raise exception 'VALIDATION_ADMIN_REQUISE: écart de % unités', v_ecart using errcode = 'P0001';
  end if;
  perform private.appliquer_mouvement_stock(
    p_variante_id, 'correction', v_ecart, 0, 'inventaire', null,
    p_motif || ' (comptage : ' || p_quantite_comptee || ', théorique : ' || v_physique || ')',
    p_cle_idempotence
  );
  return v_ecart;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retour d'une commande livrée : revendable -> retour en stock ; abîmé -> perte.
-- ---------------------------------------------------------------------------
create or replace function public.retourner_commande(p_id uuid, p_lignes jsonb, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commandes;
  r record;
  l public.commande_lignes;
  v_detail text := '';
begin
  if not private.a_role(array['ventes', 'logistique', 'stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'VALIDATION: lignes' using errcode = '22023';
  end if;
  v := private.commande_verrouillee(p_id);
  if v.statut not in ('livree', 'retournee') then
    raise exception 'TRANSITION_IMPOSSIBLE: seule une commande livrée peut faire l''objet d''un retour' using errcode = 'P0001';
  end if;

  for r in
    select (x ->> 'variante_id')::uuid as variante_id,
           (x ->> 'quantite')::integer as quantite,
           coalesce((x ->> 'revendable')::boolean, true) as revendable
    from jsonb_array_elements(p_lignes) x
    order by 1
  loop
    select * into l from public.commande_lignes
    where commande_id = p_id and variante_id = r.variante_id
    for update;
    if not found then
      raise exception 'VALIDATION: article absent de la commande' using errcode = '22023';
    end if;
    if r.quantite is null or r.quantite <= 0 or r.quantite > l.quantite - l.quantite_retournee then
      raise exception 'VALIDATION: quantite retournee' using errcode = '22023';
    end if;
    update public.commande_lignes set quantite_retournee = quantite_retournee + r.quantite where id = l.id;
    if r.revendable then
      perform private.appliquer_mouvement_stock(
        r.variante_id, 'retour', r.quantite, 0, 'commande', p_id, p_motif, null
      );
    end if;
    v_detail := v_detail || l.nom_snapshot || ' × ' || r.quantite
      || case when r.revendable then ' (remis en stock)' else ' (non revendable)' end || ' ; ';
  end loop;

  if not exists (
    select 1 from public.commande_lignes where commande_id = p_id and quantite_retournee < quantite
  ) then
    update public.commandes set statut = 'retournee' where id = p_id;
  end if;
  perform private.journal_commande(
    p_id, 'retour', v.statut,
    (select statut from public.commandes where id = p_id),
    trim(p_motif) || ' : ' || rtrim(v_detail, '; ')
  );
  return private.resume_commande(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Réglages d'alerte par produit (le rôle stock n'édite pas le catalogue)
-- ---------------------------------------------------------------------------
create or replace function public.regler_alertes_stock(
  p_produit_id uuid, p_seuil_alerte integer, p_delai_appro_jours integer, p_stock_securite_jours integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_seuil_alerte is null or p_seuil_alerte < 0
     or (p_delai_appro_jours is not null and p_delai_appro_jours <= 0)
     or (p_stock_securite_jours is not null and p_stock_securite_jours < 0) then
    raise exception 'VALIDATION: reglages' using errcode = '22023';
  end if;
  update public.produits
  set seuil_alerte = p_seuil_alerte, delai_appro_jours = p_delai_appro_jours,
      stock_securite_jours = p_stock_securite_jours
  where id = p_produit_id;
  if not found then
    raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.receptionner(jsonb)', 'public.declarer_perte(uuid, integer, text, text)',
    'public.corriger_inventaire(uuid, integer, text, text)', 'public.retourner_commande(uuid, jsonb, text)',
    'public.regler_alertes_stock(uuid, integer, integer, integer)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Le rôle stock lit le catalogue complet (produits non publiés compris) : déjà couvert par est_staff().
-- Les fournisseurs restent gérés en direct par le rôle stock (table non commerciale, RLS existante).

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to authenticated, anon;
