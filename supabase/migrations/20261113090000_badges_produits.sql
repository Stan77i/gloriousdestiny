-- Glorious Destiny — badges des articles, tous vrais :
-- • Coup de cœur : choix de l'équipe (un avis, affiché comme tel) ;
-- • Nouveau : jusqu'à la date choisie par l'équipe ;
-- • Stock limité : calculé à partir du stock réel (déjà fourni par disponibilite_variantes) ;
-- • Meilleure vente : calculée à partir des ventes réelles, jamais saisie à la main.
-- Aucun badge de prix n'est simulé : la réduction n'apparaît qu'avec une vraie promotion.

alter table public.produits
  add column coup_de_coeur boolean not null default false,
  add column nouveau_jusqu_au date;
comment on column public.produits.coup_de_coeur is 'Badge « Coup de cœur » : sélection de l''équipe.';
comment on column public.produits.nouveau_jusqu_au is 'Badge « Nouveau » affiché jusqu''à cette date incluse.';

-- Meilleures ventes : au plus 3 produits publiés, les plus vendus sur 90 jours (commandes
-- confirmées, expédiées ou livrées, retours déduits), avec au moins 3 unités vendues.
-- Seuls les identifiants sont publics : jamais les quantités ni le chiffre d'affaires.
create or replace function public.meilleures_ventes()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.produit_id
  from public.commande_lignes l
  join public.commandes c on c.id = l.commande_id
  join public.variantes v on v.id = l.variante_id
  join public.produits p on p.id = v.produit_id
  where c.statut in ('confirmee', 'expediee', 'livree')
    and c.created_at > now() - interval '90 days'
    and p.publie and p.archive_at is null
  group by v.produit_id
  having sum(l.quantite - l.quantite_retournee) >= 3
  order by sum(l.quantite - l.quantite_retournee) desc, v.produit_id
  limit 3;
$$;
revoke all on function public.meilleures_ventes() from public;
grant execute on function public.meilleures_ventes() to anon, authenticated;

-- Sélection de lancement (12/11/2026) : tous les articles publiés sont nouveaux jusqu'à fin
-- janvier ; quatre coups de cœur de l'équipe, modifiables dans l'administration.
update public.produits set nouveau_jusqu_au = date '2027-01-31'
where publie and archive_at is null;
update public.produits set coup_de_coeur = true
where slug in ('lace-glue', 'lace-melting-spray', 'glue-residue-remover-shampoo',
  'fluffy-lash-clusters-cat-eye-100d');
