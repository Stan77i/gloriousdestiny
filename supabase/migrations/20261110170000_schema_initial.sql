-- Glorious Destiny — schéma initial (Phase 2)
-- Référence : docs/ARCHITECTURE.md, section F.
-- Conventions : montants en entiers de FCFA, dates en timestamptz (UTC),
-- statuts en text + CHECK, aucune suppression de l'historique commercial.

create extension if not exists btree_gist with schema extensions;

-- Schéma privé : fonctions internes, jamais exposé par l'API.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.interdire_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'HISTORIQUE_IMMUABLE: % sur % est interdit', tg_op, tg_table_name
    using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- Personnel et rôles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  nom text not null check (length(trim(nom)) between 1 and 120),
  role text not null check (role in ('owner', 'admin', 'ventes', 'stock', 'logistique')),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Personnel interne. Le rôle détermine les permissions (voir section K).';

-- Rôle du membre du personnel connecté (null si cliente ou visiteuse).
create or replace function private.role_actuel()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.actif;
$$;

-- Vrai si l'utilisateur a l'un des rôles demandés. owner et admin ont tous les droits staff.
create or replace function private.a_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r = any (roles) or r in ('owner', 'admin') from (select private.role_actuel() as r) x where r is not null),
    false
  );
$$;

create or replace function private.est_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_actuel() is not null;
$$;

-- ---------------------------------------------------------------------------
-- Référentiels
-- ---------------------------------------------------------------------------
create table public.villes (
  id smallint generated always as identity primary key,
  nom text not null unique check (length(trim(nom)) between 1 and 80),
  pays text not null check (pays in ('CM', 'CI')),
  indicatif text not null check (indicatif in ('+237', '+225')),
  devise text not null check (devise in ('XAF', 'XOF')),
  fuseau text not null check (fuseau in ('Africa/Douala', 'Africa/Abidjan')),
  actif boolean not null default true,
  ordre smallint not null default 0
);
comment on table public.villes is 'Villes desservies (liste fermée). Déduit devise et fuseau.';

create table public.emplacements (
  id smallint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  nom text not null,
  actif boolean not null default true
);
comment on table public.emplacements is 'Lieux de stock. Un seul au départ ; prévu pour les transferts.';

create table public.parametres (
  cle text primary key check (cle ~ '^[a-z0-9_]{2,80}$'),
  valeur jsonb not null,
  public boolean not null default false,
  modifie_par uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
comment on column public.parametres.public is 'Lisible par les visiteuses (ex. lien WhatsApp, horaires).';

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nom text not null check (length(trim(nom)) between 1 and 120),
  telephone text not null check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes_internes text,
  fusionnee_dans uuid references public.clientes (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fusionnee_dans is null or fusionnee_dans <> id)
);
create unique index clientes_telephone_actif_uidx on public.clientes (telephone) where fusionnee_dans is null;
create index clientes_fusionnee_dans_idx on public.clientes (fusionnee_dans);

create table public.adresses_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  ville_id smallint not null references public.villes (id),
  quartier text not null check (length(trim(quartier)) between 1 and 120),
  adresse text check (adresse is null or length(adresse) <= 300),
  point_de_repere text not null check (length(trim(point_de_repere)) between 1 and 300),
  telephone_alternatif text check (telephone_alternatif is null or telephone_alternatif ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now()
);
create index adresses_clientes_cliente_idx on public.adresses_clientes (cliente_id);
create index adresses_clientes_ville_idx on public.adresses_clientes (ville_id);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom text not null check (length(trim(nom)) between 1 and 80),
  type text not null check (type in ('perruque', 'cils', 'produit', 'service')),
  ordre smallint not null default 0,
  publiee boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.produits (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Z0-9-]{3,40}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom text not null check (length(trim(nom)) between 1 and 160),
  description text,
  categorie_id uuid not null references public.categories (id),
  type text not null check (type in ('perruque', 'produit', 'accessoire_cils')),
  prix_fcfa integer not null check (prix_fcfa >= 0),
  publie boolean not null default false,
  archive_at timestamptz,
  seuil_alerte integer not null default 5 check (seuil_alerte >= 0),
  delai_appro_jours integer check (delai_appro_jours is null or delai_appro_jours > 0),
  stock_securite_jours integer check (stock_securite_jours is null or stock_securite_jours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (publie and archive_at is not null))
);
create index produits_categorie_idx on public.produits (categorie_id);
create index produits_publies_idx on public.produits (categorie_id) where publie and archive_at is null;

create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produits (id),
  sku text not null unique check (sku ~ '^[A-Z0-9-]{3,60}$'),
  libelle text not null check (length(trim(libelle)) between 1 and 120),
  attributs jsonb not null default '{}'::jsonb check (jsonb_typeof(attributs) = 'object'),
  prix_fcfa integer check (prix_fcfa is null or prix_fcfa >= 0),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index variantes_produit_idx on public.variantes (produit_id);
comment on column public.variantes.prix_fcfa is 'Null = prix du produit.';

create table public.images_produits (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produits (id) on delete cascade,
  variante_id uuid references public.variantes (id) on delete cascade,
  chemin_storage text not null unique check (chemin_storage ~ '^[a-z0-9/_.-]{3,200}$'),
  texte_alternatif text not null check (length(trim(texte_alternatif)) between 1 and 200),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index images_produits_produit_idx on public.images_produits (produit_id, position);
create index images_produits_variante_idx on public.images_produits (variante_id);

-- ---------------------------------------------------------------------------
-- Stock : soldes + journal append-only (section G)
-- ---------------------------------------------------------------------------
create table public.stocks (
  variante_id uuid not null references public.variantes (id),
  emplacement_id smallint not null references public.emplacements (id),
  physique integer not null default 0 check (physique >= 0),
  reserve integer not null default 0 check (reserve >= 0),
  disponible integer generated always as (physique - reserve) stored,
  updated_at timestamptz not null default now(),
  primary key (variante_id, emplacement_id),
  constraint stocks_reserve_inferieur_physique check (reserve <= physique)
);
create index stocks_emplacement_idx on public.stocks (emplacement_id);
comment on table public.stocks is 'Soldes. Modifiés uniquement par private.appliquer_mouvement_stock (jamais directement).';

create table public.mouvements_stock (
  id bigint generated always as identity primary key,
  variante_id uuid not null references public.variantes (id),
  emplacement_id smallint not null references public.emplacements (id),
  type text not null check (type in (
    'entree', 'reservation', 'annulation_reservation', 'vente', 'retour',
    'perte', 'correction', 'transfert', 'livraison'
  )),
  delta_physique integer not null,
  delta_reserve integer not null,
  reference_type text check (reference_type in ('commande', 'reception', 'inventaire', 'manuel')),
  reference_id uuid,
  motif text,
  auteur_id uuid references auth.users (id),
  cle_idempotence text unique check (cle_idempotence is null or length(cle_idempotence) between 8 and 120),
  created_at timestamptz not null default now(),
  constraint mouvements_signes_par_type check (
    case type
      when 'entree' then delta_physique > 0 and delta_reserve = 0
      when 'reservation' then delta_physique = 0 and delta_reserve > 0
      when 'annulation_reservation' then delta_physique = 0 and delta_reserve < 0
      when 'vente' then delta_physique < 0 and delta_reserve = delta_physique
      when 'retour' then delta_physique > 0 and delta_reserve = 0
      when 'perte' then delta_physique < 0 and delta_reserve = 0
      when 'correction' then delta_physique <> 0 and delta_reserve = 0
      when 'transfert' then delta_physique <> 0 and delta_reserve = 0
      when 'livraison' then delta_physique = 0 and delta_reserve = 0
    end
  ),
  constraint mouvements_motif_obligatoire check (
    type not in ('perte', 'correction') or length(trim(coalesce(motif, ''))) > 0
  )
);
create index mouvements_stock_variante_idx on public.mouvements_stock (variante_id, created_at);
create index mouvements_stock_reference_idx on public.mouvements_stock (reference_type, reference_id);
create index mouvements_stock_emplacement_idx on public.mouvements_stock (emplacement_id);
create index mouvements_stock_auteur_idx on public.mouvements_stock (auteur_id);

create trigger mouvements_stock_immuable
  before update or delete on public.mouvements_stock
  for each row execute function private.interdire_modification();

-- ---------------------------------------------------------------------------
-- Fournisseurs et réceptions
-- ---------------------------------------------------------------------------
create table public.fournisseurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 160),
  telephone text check (telephone is null or telephone ~ '^\+[1-9][0-9]{7,14}$'),
  ville text,
  notes text,
  archive_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receptions (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id uuid references public.fournisseurs (id),
  reference_fournisseur text,
  date_reception date not null default current_date,
  auteur_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index receptions_fournisseur_idx on public.receptions (fournisseur_id);
create index receptions_auteur_idx on public.receptions (auteur_id);

create table public.reception_lignes (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references public.receptions (id),
  variante_id uuid not null references public.variantes (id),
  quantite integer not null check (quantite > 0),
  cout_unitaire_fcfa integer check (cout_unitaire_fcfa is null or cout_unitaire_fcfa >= 0)
);
create index reception_lignes_reception_idx on public.reception_lignes (reception_id);
create index reception_lignes_variante_idx on public.reception_lignes (variante_id);

-- ---------------------------------------------------------------------------
-- Services et rendez-vous (section I)
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom text not null check (length(trim(nom)) between 1 and 160),
  description text,
  type text not null check (type in ('perruque', 'cils', 'autre')),
  duree_minutes integer not null check (duree_minutes between 5 and 720),
  tampon_avant_minutes integer not null default 0 check (tampon_avant_minutes between 0 and 240),
  tampon_apres_minutes integer not null default 0 check (tampon_apres_minutes between 0 and 240),
  prix_fcfa integer not null check (prix_fcfa >= 0),
  publie boolean not null default false,
  archive_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (publie and archive_at is not null))
);

create table public.disponibilites_services (
  id uuid primary key default gen_random_uuid(),
  jour_semaine smallint not null check (jour_semaine between 0 and 6),
  heure_debut time not null,
  heure_fin time not null,
  pas_minutes integer not null default 30 check (pas_minutes between 5 and 240),
  actif boolean not null default true,
  check (heure_fin > heure_debut)
);
comment on column public.disponibilites_services.jour_semaine is '0 = dimanche … 6 = samedi (convention extract(dow)). Heures locales du salon.';

create table public.exceptions_disponibilite (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  ferme boolean not null default true,
  heure_debut time,
  heure_fin time,
  motif text,
  check (ferme or (heure_debut is not null and heure_fin is not null and heure_fin > heure_debut))
);

create table public.rendez_vous (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  service_id uuid not null references public.services (id),
  debut timestamptz not null,
  fin timestamptz not null,
  occupe_debut timestamptz not null,
  occupe_fin timestamptz not null,
  statut text not null default 'demande' check (statut in ('demande', 'confirme', 'annule', 'termine', 'absent')),
  notes text check (notes is null or length(notes) <= 1000),
  motif_annulation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fin > debut),
  check (occupe_debut <= debut and occupe_fin >= fin),
  check (statut <> 'annule' or length(trim(coalesce(motif_annulation, ''))) > 0),
  constraint rendez_vous_sans_chevauchement exclude using gist (
    tstzrange(occupe_debut, occupe_fin, '[)') with &&
  ) where (statut in ('demande', 'confirme'))
);
create index rendez_vous_debut_idx on public.rendez_vous (debut);
create index rendez_vous_cliente_idx on public.rendez_vous (cliente_id);
create index rendez_vous_service_idx on public.rendez_vous (service_id);

-- ---------------------------------------------------------------------------
-- Commandes (sections E7, G, H)
-- ---------------------------------------------------------------------------
create sequence public.commandes_reference_seq;

create table public.commandes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^GD-[0-9]{4}-[0-9]{4,}$'),
  cliente_id uuid not null references public.clientes (id),
  ville_id smallint not null references public.villes (id),
  devise text not null check (devise in ('XAF', 'XOF')),
  canal text not null default 'whatsapp' check (canal in ('web', 'whatsapp')),
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'confirmee', 'expediee', 'livree', 'annulee', 'retournee')),
  sous_total_fcfa integer not null check (sous_total_fcfa >= 0),
  frais_livraison_fcfa integer not null default 0 check (frais_livraison_fcfa >= 0),
  total_fcfa integer not null check (total_fcfa >= 0),
  cle_idempotence text not null unique check (length(cle_idempotence) between 8 and 120),
  reservation_expire_at timestamptz,
  message_whatsapp_genere_at timestamptz,
  message_whatsapp_ouvert_at timestamptz,
  confirmee_at timestamptz,
  annulee_at timestamptz,
  motif_annulation text,
  statut_paiement text not null default 'non_paye' check (statut_paiement in ('non_paye', 'paye', 'rembourse')),
  mode_paiement text check (mode_paiement in ('especes', 'mobile_money')),
  montant_encaisse_fcfa integer check (montant_encaisse_fcfa is null or montant_encaisse_fcfa >= 0),
  reference_paiement text check (reference_paiement is null or length(reference_paiement) <= 80),
  paye_at timestamptz,
  encaisse_par uuid references auth.users (id),
  notes_internes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commandes_total_coherent check (total_fcfa = sous_total_fcfa + frais_livraison_fcfa),
  constraint commandes_paiement_complet check (
    statut_paiement = 'non_paye'
    or (mode_paiement is not null and paye_at is not null and montant_encaisse_fcfa is not null)
  ),
  constraint commandes_annulation_motivee check (
    statut <> 'annulee' or (annulee_at is not null and length(trim(coalesce(motif_annulation, ''))) > 0)
  )
);
create index commandes_statut_date_idx on public.commandes (statut, created_at);
create index commandes_cliente_idx on public.commandes (cliente_id);
create index commandes_ville_idx on public.commandes (ville_id);
create index commandes_encaisse_par_idx on public.commandes (encaisse_par);
create index commandes_expiration_idx on public.commandes (reservation_expire_at) where statut = 'nouvelle';

create table public.commande_lignes (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes (id),
  variante_id uuid not null references public.variantes (id),
  nom_snapshot text not null,
  prix_unitaire_snapshot_fcfa integer not null check (prix_unitaire_snapshot_fcfa >= 0),
  quantite integer not null check (quantite > 0),
  total_ligne_fcfa integer not null,
  quantite_retournee integer not null default 0,
  check (total_ligne_fcfa = prix_unitaire_snapshot_fcfa * quantite),
  check (quantite_retournee between 0 and quantite)
);
create index commande_lignes_commande_idx on public.commande_lignes (commande_id);
create index commande_lignes_variante_idx on public.commande_lignes (variante_id);

create table public.livraisons (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes (id),
  ville_id smallint not null references public.villes (id),
  quartier text not null,
  adresse text,
  point_de_repere text not null,
  telephone text not null check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  statut text not null default 'a_preparer' check (statut in ('a_preparer', 'expediee', 'livree', 'echec', 'retournee')),
  motif_echec text,
  expediee_at timestamptz,
  livree_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (statut <> 'echec' or length(trim(coalesce(motif_echec, ''))) > 0),
  check (statut not in ('expediee', 'livree') or expediee_at is not null),
  check (statut <> 'livree' or livree_at is not null)
);
create unique index livraisons_une_active_par_commande_uidx
  on public.livraisons (commande_id) where statut in ('a_preparer', 'expediee', 'livree');
create index livraisons_ville_livree_idx on public.livraisons (ville_id, livree_at);
create index livraisons_statut_idx on public.livraisons (statut);

-- ---------------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  auteur_id uuid,
  action text not null,
  entite text not null,
  entite_id text,
  avant jsonb,
  apres jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entite_idx on public.audit_logs (entite, entite_id);
create index audit_logs_date_idx on public.audit_logs (created_at);

create trigger audit_logs_immuable
  before update or delete on public.audit_logs
  for each row execute function private.interdire_modification();

create or replace function private.journaliser()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (auteur_id, action, entite, entite_id, avant, apres)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'cle', to_jsonb(old) ->> 'cle'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Tables sensibles journalisées.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'parametres', 'produits', 'variantes', 'services', 'commandes', 'livraisons', 'rendez_vous', 'clientes']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.journaliser()', t || '_audit', t);
  end loop;
end;
$$;

-- updated_at automatique.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'clientes', 'categories', 'produits', 'variantes', 'stocks', 'fournisseurs', 'services', 'rendez_vous', 'commandes', 'livraisons', 'parametres']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t || '_updated_at', t);
  end loop;
end;
$$;

-- Aucune suppression sur les tables commerciales, même par erreur de code.
do $$
declare t text;
begin
  foreach t in array array['clientes', 'adresses_clientes', 'commandes', 'commande_lignes', 'livraisons', 'rendez_vous', 'receptions', 'reception_lignes', 'produits', 'variantes', 'services', 'stocks']
  loop
    execute format('create trigger %I before delete on public.%I for each row execute function private.interdire_modification()', t || '_sans_suppression', t);
  end loop;
end;
$$;
