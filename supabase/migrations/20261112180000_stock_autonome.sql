-- Glorious Destiny — gestion autonome du stock.
-- S'appuie sur le noyau existant (private.appliquer_mouvement_stock, réservations, ventes,
-- annulations, retours, réceptions, pertes, inventaires) sans le dupliquer. Ajoute :
-- • les quantités avant/après dans chaque mouvement (historique lisible) ;
-- • un verrou de 5 minutes, géré par le serveur, sur les modifications manuelles de quantité,
--   avec déverrouillage motivé et journalisé ;
-- • l'ajustement direct (+/−) avec garde-fous (stock négatif, sous les réservations,
--   confirmation des fortes baisses) ;
-- • la création de produits et de formats depuis l'administration (aucun produit codé en dur) ;
-- • la modification d'un article (nom, catégorie, unité de vente, seuil) ;
-- • le tableau de bord du stock (indicateurs calculés sur les données réelles).

-- ---------------------------------------------------------------------------
-- Paramètres
-- ---------------------------------------------------------------------------
insert into public.parametres (cle, valeur, public) values
  ('verrou_stock_minutes', to_jsonb(5), false),
  ('seuil_confirmation_baisse', to_jsonb(10), false)
on conflict (cle) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Quantités avant / après dans le journal des mouvements
-- ---------------------------------------------------------------------------
alter table public.mouvements_stock
  add column physique_avant integer,
  add column physique_apres integer;

-- Rétro-calcul des mouvements existants (le journal part de zéro et chaque quantité n'a
-- jamais changé qu'à travers lui) : simple cumul par article et emplacement.
alter table public.mouvements_stock disable trigger mouvements_stock_immuable;
update public.mouvements_stock m
set physique_apres = x.apres, physique_avant = x.apres - m.delta_physique
from (
  select id, sum(delta_physique) over (partition by variante_id, emplacement_id order by id) as apres
  from public.mouvements_stock
) x
where x.id = m.id;
alter table public.mouvements_stock enable trigger mouvements_stock_immuable;

-- ---------------------------------------------------------------------------
-- 2. Verrou des modifications manuelles
-- ---------------------------------------------------------------------------
create table public.verrous_stock (
  variante_id uuid primary key references public.variantes (id),
  modifie_at timestamptz not null,
  modifie_par uuid references auth.users (id),
  modifiable_jusqu_a timestamptz not null
);
comment on table public.verrous_stock is
  'Dernière modification manuelle d''un article et fin de sa fenêtre de modification. Écrit uniquement par le serveur.';

create table public.deverrouillages_stock (
  id bigint generated always as identity primary key,
  variante_id uuid not null references public.variantes (id),
  motif text not null check (length(trim(motif)) between 3 and 300),
  auteur_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index deverrouillages_stock_variante_idx on public.deverrouillages_stock (variante_id, created_at desc);
create trigger deverrouillages_stock_immuable
  before update or delete on public.deverrouillages_stock
  for each row execute function private.interdire_modification();

alter table public.verrous_stock enable row level security;
alter table public.deverrouillages_stock enable row level security;
revoke all on public.verrous_stock, public.deverrouillages_stock from anon, authenticated;
grant select on public.verrous_stock, public.deverrouillages_stock to authenticated;
create policy verrous_lecture_staff on public.verrous_stock for select to authenticated
  using (private.est_staff());
create policy deverrouillages_lecture_staff on public.deverrouillages_stock for select to authenticated
  using (private.est_staff());

create or replace function private.duree_verrou_stock()
returns interval
language sql
stable
security definer
set search_path = ''
as $$
  select make_interval(mins => coalesce(
    (select (valeur #>> '{}')::integer from public.parametres where cle = 'verrou_stock_minutes'), 5));
$$;

-- Refuse une modification manuelle si la fenêtre est close (jamais modifié : modifiable).
create or replace function private.controler_verrou_stock(p_variante_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fin timestamptz;
begin
  select modifiable_jusqu_a into v_fin from public.verrous_stock where variante_id = p_variante_id;
  if found and now() > v_fin then
    raise exception 'STOCK_VERROUILLE: déverrouillez l''article en indiquant le motif' using errcode = 'P0001';
  end if;
end;
$$;

-- Toute modification manuelle (réception, ajustement, correction, perte) ouvre une fenêtre
-- de modification à partir de son enregistrement.
create or replace function private.noter_modification_stock(p_variante_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.verrous_stock (variante_id, modifie_at, modifie_par, modifiable_jusqu_a)
  values (p_variante_id, now(), (select auth.uid()), now() + private.duree_verrou_stock())
  on conflict (variante_id) do update
  set modifie_at = excluded.modifie_at, modifie_par = excluded.modifie_par,
      modifiable_jusqu_a = excluded.modifiable_jusqu_a;
$$;

-- État initial : les articles déjà modifiés à la main le sont depuis plus de 5 minutes.
insert into public.verrous_stock (variante_id, modifie_at, modifie_par, modifiable_jusqu_a)
select distinct on (variante_id) variante_id, created_at, auteur_id, created_at + private.duree_verrou_stock()
from public.mouvements_stock
where type in ('entree', 'correction', 'perte')
order by variante_id, id desc
on conflict (variante_id) do nothing;

create or replace function public.deverrouiller_stock(p_variante_id uuid, p_motif text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fin timestamptz := now() + private.duree_verrou_stock();
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  if not exists (select 1 from public.variantes where id = p_variante_id) then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;
  insert into public.deverrouillages_stock (variante_id, motif, auteur_id)
  values (p_variante_id, trim(p_motif), (select auth.uid()));
  insert into public.verrous_stock (variante_id, modifie_at, modifie_par, modifiable_jusqu_a)
  values (p_variante_id, now(), (select auth.uid()), v_fin)
  on conflict (variante_id) do update set modifiable_jusqu_a = v_fin;
  return v_fin;
end;
$$;

-- ---------------------------------------------------------------------------
-- Noyau : quantités avant/après et fenêtre de modification
-- ---------------------------------------------------------------------------
create or replace function private.appliquer_mouvement_stock(
  p_variante_id uuid,
  p_type text,
  p_delta_physique integer,
  p_delta_reserve integer,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_motif text default null,
  p_cle_idempotence text default null,
  p_emplacement_id smallint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emplacement smallint := coalesce(p_emplacement_id, private.emplacement_principal());
  v_existant bigint;
  v_id bigint;
  v_apres integer;
begin
  if v_emplacement is null then
    raise exception 'EMPLACEMENT_INCONNU' using errcode = 'P0001';
  end if;

  -- Idempotence : un même appel rejoué ne produit pas deux mouvements.
  if p_cle_idempotence is not null then
    select id into v_existant from public.mouvements_stock where cle_idempotence = p_cle_idempotence;
    if found then
      return v_existant;
    end if;
  end if;

  insert into public.stocks (variante_id, emplacement_id)
  values (p_variante_id, v_emplacement)
  on conflict do nothing;

  -- Verrou de la ligne : les mouvements concurrents sur la même variante s'exécutent l'un après l'autre.
  perform 1 from public.stocks
  where variante_id = p_variante_id and emplacement_id = v_emplacement
  for update;

  begin
    update public.stocks
    set physique = physique + p_delta_physique,
        reserve = reserve + p_delta_reserve
    where variante_id = p_variante_id and emplacement_id = v_emplacement
    returning physique into v_apres;
  exception when check_violation then
    raise exception 'STOCK_INSUFFISANT: variante %', p_variante_id using errcode = 'P0001';
  end;

  insert into public.mouvements_stock (
    variante_id, emplacement_id, type, delta_physique, delta_reserve,
    reference_type, reference_id, motif, auteur_id, cle_idempotence,
    physique_avant, physique_apres
  )
  values (
    p_variante_id, v_emplacement, p_type, p_delta_physique, p_delta_reserve,
    p_reference_type, p_reference_id, nullif(trim(p_motif), ''), (select auth.uid()), p_cle_idempotence,
    v_apres - p_delta_physique, v_apres
  )
  returning id into v_id;

  -- Modification manuelle par un membre de l'équipe : nouvelle fenêtre de modification.
  if p_type in ('entree', 'correction', 'perte') and (select auth.uid()) is not null then
    perform private.noter_modification_stock(p_variante_id);
  end if;

  return v_id;
end;
$$;
revoke all on function private.appliquer_mouvement_stock(uuid, text, integer, integer, text, uuid, text, text, smallint) from public;

-- ---------------------------------------------------------------------------
-- 3. Ajustement direct (+/−), pertes et inventaires : verrou et garde-fous
-- ---------------------------------------------------------------------------
create or replace function public.ajuster_stock(
  p_variante_id uuid, p_delta integer, p_motif text, p_cle_idempotence text, p_confirme boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_physique integer;
  v_reserve integer;
  v_seuil_confirmation integer;
  v_seuil_admin integer;
  v_id bigint;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'VALIDATION: quantite' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_motif, ''))) < 3 then
    raise exception 'VALIDATION: motif' using errcode = '22023';
  end if;
  if p_cle_idempotence is null or length(p_cle_idempotence) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant' using errcode = '22023';
  end if;
  -- Rejeu (double clic, réseau) : on renvoie l'état sans rien refaire.
  if exists (select 1 from public.mouvements_stock where cle_idempotence = p_cle_idempotence) then
    select physique, reserve into v_physique, v_reserve from public.stocks
    where variante_id = p_variante_id and emplacement_id = private.emplacement_principal();
    return jsonb_build_object('physique', v_physique, 'reserve', v_reserve, 'rejoue', true);
  end if;

  perform private.controler_verrou_stock(p_variante_id);

  insert into public.stocks (variante_id, emplacement_id)
  values (p_variante_id, private.emplacement_principal())
  on conflict do nothing;
  select physique, reserve into v_physique, v_reserve from public.stocks
  where variante_id = p_variante_id and emplacement_id = private.emplacement_principal()
  for update;
  if not found then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;

  if v_physique + p_delta < 0 then
    raise exception 'STOCK_NEGATIF: % en stock, retrait de % impossible', v_physique, -p_delta using errcode = 'P0001';
  end if;
  if v_physique + p_delta < v_reserve then
    raise exception 'SOUS_RESERVE: % unité(s) réservée(s) par des commandes en cours', v_reserve using errcode = 'P0001';
  end if;

  select coalesce((valeur #>> '{}')::integer, 10) into v_seuil_confirmation
  from public.parametres where cle = 'seuil_confirmation_baisse';
  if p_delta < 0 and not coalesce(p_confirme, false)
     and (-p_delta >= coalesce(v_seuil_confirmation, 10) or -p_delta * 2 > v_physique) then
    raise exception 'CONFIRMATION_REQUISE: baisse de % unité(s) sur %', -p_delta, v_physique using errcode = 'P0001';
  end if;

  select coalesce((valeur #>> '{}')::integer, 10) into v_seuil_admin
  from public.parametres where cle = 'seuil_double_validation_inventaire';
  if p_delta < 0 and -p_delta > coalesce(v_seuil_admin, 10) and private.role_actuel() not in ('owner', 'admin') then
    raise exception 'VALIDATION_ADMIN_REQUISE: baisse de % unités', -p_delta using errcode = 'P0001';
  end if;

  v_id := private.appliquer_mouvement_stock(
    p_variante_id, 'correction', p_delta, 0, 'manuel', null, trim(p_motif), p_cle_idempotence
  );
  return jsonb_build_object('physique', v_physique + p_delta, 'reserve', v_reserve, 'mouvement', v_id);
end;
$$;

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
  if not exists (select 1 from public.mouvements_stock where cle_idempotence = p_cle_idempotence) then
    perform private.controler_verrou_stock(p_variante_id);
  end if;
  return private.appliquer_mouvement_stock(
    p_variante_id, 'perte', -p_quantite, 0, 'manuel', null, p_motif, p_cle_idempotence
  );
end;
$$;

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
  perform private.controler_verrou_stock(p_variante_id);

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
-- 4. Produits : création, formats, modification d'un article
-- ---------------------------------------------------------------------------
create or replace function private.slugifier(p_texte text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_texte, '')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ’''',
      'aaaaaaceeeeiiiinooooouuuuyyoa--'),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Code article lisible et unique (ex. GD-SILKENIN-3F2A).
create or replace function private.nouveau_sku(p_nom text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_base text := upper(left(replace(private.slugifier(p_nom), '-', ''), 10));
  v_sku text;
begin
  if v_base = '' then v_base := 'ART'; end if;
  loop
    v_sku := 'GD-' || v_base || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from public.produits where sku = v_sku)
          and not exists (select 1 from public.variantes where sku = v_sku || '-STD');
  end loop;
  return v_sku;
end;
$$;

-- Catégorie existante (categorie_id) ou nouvelle (nouvelle_categorie + type_categorie).
create or replace function private.categorie_pour(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'categorie_id', '')::uuid;
  v_nom text := trim(coalesce(p ->> 'nouvelle_categorie', ''));
  v_type text := coalesce(nullif(p ->> 'type_categorie', ''), 'produit');
  v_slug text;
begin
  if v_id is not null then
    if not exists (select 1 from public.categories where id = v_id) then
      raise exception 'VALIDATION: categorie' using errcode = '22023';
    end if;
    return v_id;
  end if;
  if length(v_nom) not between 2 and 80 or v_type not in ('perruque', 'cils', 'produit') then
    raise exception 'VALIDATION: categorie' using errcode = '22023';
  end if;
  v_slug := private.slugifier(v_nom);
  select id into v_id from public.categories where slug = v_slug;
  if v_id is null then
    insert into public.categories (slug, nom, type, ordre, publiee)
    values (v_slug, v_nom, v_type, (select coalesce(max(ordre), 0) + 1 from public.categories), true)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.creer_produit(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom text := trim(coalesce(p ->> 'nom', ''));
  v_unite text := coalesce(nullif(trim(p ->> 'unite'), ''), 'Format standard');
  v_prix integer := (p ->> 'prix_fcfa')::integer;
  v_seuil integer := coalesce((p ->> 'seuil_alerte')::integer, 5);
  v_stock integer := coalesce((p ->> 'stock_initial')::integer, 0);
  v_cle text := p ->> 'cle_idempotence';
  v_categorie uuid;
  v_type_cat text;
  v_slug text;
  v_sku text;
  v_produit uuid;
  v_variante uuid;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(v_nom) not between 2 and 160 then
    raise exception 'VALIDATION: nom' using errcode = '22023';
  end if;
  if v_prix is null or v_prix < 0 or v_seuil < 0 or v_stock < 0 or length(v_unite) > 120 then
    raise exception 'VALIDATION: valeurs' using errcode = '22023';
  end if;
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant' using errcode = '22023';
  end if;
  -- Rejeu (double clic, réseau) : on renvoie le produit déjà créé.
  select v.id into v_variante from public.variantes v where v.attributs ->> 'cle_creation' = v_cle;
  if found then
    return v_variante;
  end if;

  v_categorie := private.categorie_pour(p);
  select type into v_type_cat from public.categories where id = v_categorie;
  v_slug := private.slugifier(v_nom);
  if v_slug = '' then v_slug := 'article'; end if;
  if exists (select 1 from public.produits where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;
  v_sku := private.nouveau_sku(v_nom);

  insert into public.produits (sku, slug, nom, description, categorie_id, type, prix_fcfa, publie, seuil_alerte)
  values (
    v_sku, v_slug, v_nom, nullif(trim(coalesce(p ->> 'description', '')), ''), v_categorie,
    case v_type_cat when 'perruque' then 'perruque' when 'cils' then 'accessoire_cils' else 'produit' end,
    v_prix, coalesce((p ->> 'publie')::boolean, false), v_seuil
  )
  returning id into v_produit;

  insert into public.variantes (produit_id, sku, libelle, attributs)
  values (v_produit, v_sku || '-STD', v_unite, jsonb_build_object('cle_creation', v_cle))
  returning id into v_variante;

  insert into public.stocks (variante_id, emplacement_id)
  values (v_variante, private.emplacement_principal())
  on conflict do nothing;
  if v_stock > 0 then
    perform private.appliquer_mouvement_stock(
      v_variante, 'entree', v_stock, 0, 'manuel', null, 'Stock initial à la création', 'creation-' || v_cle
    );
  end if;
  return v_variante;
end;
$$;

-- Nouveau format (unité de vente) d'un produit existant, avec son prix et son stock initial.
create or replace function public.ajouter_format(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produit uuid := (p ->> 'produit_id')::uuid;
  v_unite text := trim(coalesce(p ->> 'unite', ''));
  v_prix integer := (p ->> 'prix_fcfa')::integer;
  v_stock integer := coalesce((p ->> 'stock_initial')::integer, 0);
  v_cle text := p ->> 'cle_idempotence';
  v_sku text;
  v_variante uuid;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  if length(v_unite) not between 1 and 120 or (v_prix is not null and v_prix < 0) or v_stock < 0 then
    raise exception 'VALIDATION: valeurs' using errcode = '22023';
  end if;
  if v_cle is null or length(v_cle) not between 8 and 120 then
    raise exception 'VALIDATION: identifiant' using errcode = '22023';
  end if;
  select v.id into v_variante from public.variantes v where v.attributs ->> 'cle_creation' = v_cle;
  if found then
    return v_variante;
  end if;
  select sku into v_sku from public.produits where id = v_produit and archive_at is null;
  if not found then
    raise exception 'PRODUIT_INDISPONIBLE' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.variantes where produit_id = v_produit and actif and lower(libelle) = lower(v_unite)) then
    raise exception 'VALIDATION: ce format existe déjà' using errcode = '22023';
  end if;
  v_sku := v_sku || '-' || upper(left(replace(private.slugifier(v_unite), '-', ''), 8));
  if v_sku !~ '^[A-Z0-9-]{3,60}$' or exists (select 1 from public.variantes where sku = v_sku) then
    v_sku := left(v_sku, 50) || '-' || upper(substr(md5(random()::text), 1, 4));
  end if;
  insert into public.variantes (produit_id, sku, libelle, prix_fcfa, attributs)
  values (v_produit, v_sku, v_unite, v_prix, jsonb_build_object('cle_creation', v_cle))
  returning id into v_variante;
  insert into public.stocks (variante_id, emplacement_id)
  values (v_variante, private.emplacement_principal())
  on conflict do nothing;
  if v_stock > 0 then
    perform private.appliquer_mouvement_stock(
      v_variante, 'entree', v_stock, 0, 'manuel', null, 'Stock initial du nouveau format', 'creation-' || v_cle
    );
  end if;
  return v_variante;
end;
$$;

-- Nom, catégorie, unité de vente et seuil d'alerte d'un article (le changement est journalisé
-- par l'audit général des tables produits et variantes). Les quantités ne changent jamais ici.
create or replace function public.modifier_article(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_variante uuid := (p ->> 'variante_id')::uuid;
  v_produit uuid;
  v_nom text := trim(coalesce(p ->> 'nom', ''));
  v_unite text := trim(coalesce(p ->> 'unite', ''));
  v_seuil integer := (p ->> 'seuil_alerte')::integer;
  v_categorie uuid;
  v_type_cat text;
begin
  if not private.a_role(array['stock']) then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  select produit_id into v_produit from public.variantes where id = v_variante;
  if not found then
    raise exception 'VARIANTE_INCONNUE' using errcode = 'P0002';
  end if;
  if length(v_nom) not between 2 and 160 or length(v_unite) not between 1 and 120
     or v_seuil is null or v_seuil < 0 then
    raise exception 'VALIDATION: valeurs' using errcode = '22023';
  end if;
  v_categorie := private.categorie_pour(p);
  select type into v_type_cat from public.categories where id = v_categorie;
  update public.produits
  set nom = v_nom, categorie_id = v_categorie, seuil_alerte = v_seuil,
      type = case v_type_cat when 'perruque' then 'perruque' when 'cils' then 'accessoire_cils' else 'produit' end
  where id = v_produit;
  update public.variantes set libelle = v_unite where id = v_variante;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Vue de pilotage enrichie : vendus, catégorie, verrou (calculé par le serveur)
-- ---------------------------------------------------------------------------
create or replace view public.vue_stock
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
  s.updated_at as mis_a_jour_le,
  p.categorie_id,
  coalesce(vd.vendus, 0)::integer as vendus,
  coalesce(vd.vendus_30j, 0)::integer as vendus_30j,
  vr.modifie_at,
  vr.modifie_par,
  vr.modifiable_jusqu_a,
  (vr.variante_id is not null and now() > vr.modifiable_jusqu_a) as verrouille,
  greatest(0, ceil(extract(epoch from (vr.modifiable_jusqu_a - now()))))::integer as secondes_restantes,
  coalesce(v.prix_fcfa, p.prix_fcfa) as prix_fcfa
from public.variantes v
join public.produits p on p.id = v.produit_id
join public.categories c on c.id = p.categorie_id
left join public.stocks s on s.variante_id = v.id and s.emplacement_id = private.emplacement_principal()
left join public.verrous_stock vr on vr.variante_id = v.id
left join lateral (
  -- Ventes nettes des retours : une vente n'est comptée qu'une fois (mouvement « vente » à l'expédition).
  select
    sum(case when m.type = 'vente' then -m.delta_physique when m.type = 'retour' then -m.delta_physique else 0 end) as vendus,
    sum(case when m.created_at > now() - interval '30 days' then
      case when m.type = 'vente' then -m.delta_physique when m.type = 'retour' then -m.delta_physique else 0 end
    else 0 end) as vendus_30j
  from public.mouvements_stock m
  where m.variante_id = v.id and m.type in ('vente', 'retour')
) vd on true
where v.actif and p.archive_at is null;

grant select on public.vue_stock to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Tableau de bord du stock (données réelles)
-- ---------------------------------------------------------------------------
create or replace function public.tableau_stock()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.est_staff() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  return (
    with articles as (
      select v.id, p.seuil_alerte,
             coalesce(s.physique, 0) as physique, coalesce(s.reserve, 0) as reserve,
             coalesce(s.disponible, 0) as disponible, v.created_at
      from public.variantes v
      join public.produits p on p.id = v.produit_id
      left join public.stocks s on s.variante_id = v.id and s.emplacement_id = private.emplacement_principal()
      where v.actif and p.archive_at is null
    ),
    ventes as (
      select m.variante_id, sum(-m.delta_physique) as quantite, max(m.created_at) as derniere
      from public.mouvements_stock m
      where m.type in ('vente', 'retour')
      group by m.variante_id
    ),
    ventes_30 as (
      select m.variante_id, sum(-m.delta_physique) as quantite
      from public.mouvements_stock m
      where m.type in ('vente', 'retour') and m.created_at > now() - interval '30 days'
      group by m.variante_id
    )
    select jsonb_build_object(
      'articles', (select count(*) from articles),
      'disponibles', (select count(*) from articles where disponible > seuil_alerte),
      'stock_faible', (select count(*) from articles where disponible > 0 and disponible <= seuil_alerte),
      'ruptures', (select count(*) from articles where disponible <= 0),
      'physique_total', (select coalesce(sum(physique), 0) from articles),
      'reserve_total', (select coalesce(sum(reserve), 0) from articles),
      'dernieres_entrees', coalesce((
        select jsonb_agg(x) from (
          select m.id, private.nom_variante(m.variante_id) as article, m.delta_physique as quantite,
                 m.physique_apres, m.created_at, pr.nom as auteur, m.motif
          from public.mouvements_stock m left join public.profiles pr on pr.id = m.auteur_id
          where m.type = 'entree'
          order by m.id desc limit 6
        ) x
      ), '[]'::jsonb),
      'dernieres_corrections', coalesce((
        select jsonb_agg(x) from (
          select m.id, private.nom_variante(m.variante_id) as article, m.type, m.delta_physique as quantite,
                 m.physique_avant, m.physique_apres, m.created_at, pr.nom as auteur, m.motif
          from public.mouvements_stock m left join public.profiles pr on pr.id = m.auteur_id
          where m.type in ('correction', 'perte')
          order by m.id desc limit 6
        ) x
      ), '[]'::jsonb),
      'plus_vendus', coalesce((
        select jsonb_agg(x) from (
          select v.variante_id, private.nom_variante(v.variante_id) as article, v.quantite::integer as quantite
          from ventes_30 v where v.quantite > 0
          order by v.quantite desc, 2 limit 5
        ) x
      ), '[]'::jsonb),
      -- Sans vente depuis 60 jours (ou jamais vendu) alors qu'il y a du stock, hors articles créés récemment.
      'dormants', coalesce((
        select jsonb_agg(x) from (
          select a.id as variante_id, private.nom_variante(a.id) as article, a.physique, v.derniere as derniere_vente
          from articles a left join ventes v on v.variante_id = a.id
          where a.physique > 0
            and coalesce(v.derniere, a.created_at) < now() - interval '60 days'
          order by coalesce(v.derniere, a.created_at), 2 limit 8
        ) x
      ), '[]'::jsonb)
    )
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
    'public.ajuster_stock(uuid, integer, text, text, boolean)',
    'public.deverrouiller_stock(uuid, text)',
    'public.creer_produit(jsonb)',
    'public.ajouter_format(jsonb)',
    'public.modifier_article(jsonb)',
    'public.tableau_stock()',
    'public.declarer_perte(uuid, integer, text, text)',
    'public.corriger_inventaire(uuid, integer, text, text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.a_role(text[]), private.est_staff(), private.role_actuel(),
  private.emplacement_principal() to authenticated, anon;
