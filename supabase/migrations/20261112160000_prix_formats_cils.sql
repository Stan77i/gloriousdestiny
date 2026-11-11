-- Glorious Destiny — prix et formats communiqués par la cliente (11/11/2026), nouveaux produits
-- (cils, gels, colle cils, la gamme) et stock initial de 40 par nouveau format.
-- Aucune commande n'existe encore sur ces variantes : on renomme les formats « standard » sans
-- toucher à l'historique. Le stock ne change que par des mouvements (idempotents).
-- Hair Curl Mousse, Glue Residue Remover Shampoo et Braid Gel gardent leur prix (non communiqués).

-- ---------------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------------
insert into public.categories (slug, nom, type, ordre, publiee) values
  ('coffret', 'Coffret', 'produit', 5, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Formats et prix des produits existants (prix du produit = plus petit format)
-- ---------------------------------------------------------------------------
update public.produits set prix_fcfa = 4000 where slug = 'lace-glue';
update public.variantes set libelle = '38 ml', prix_fcfa = 4000 where sku = 'GD-LG-STD';

update public.produits set prix_fcfa = 3500 where slug = 'lace-melting-spray';
update public.variantes set libelle = '130 ml', prix_fcfa = 3500 where sku = 'GD-LMS-STD';

update public.produits set prix_fcfa = 1000 where slug = 'lace-glue-remover-spray';
update public.variantes set libelle = '50 ml', prix_fcfa = 2000 where sku = 'GD-LGRS-STD';

update public.produits set prix_fcfa = 1000 where slug = 'wax-stick';
update public.variantes set libelle = 'Petit format', prix_fcfa = 1000 where sku = 'GD-WS-STD';

insert into public.variantes (produit_id, sku, libelle, prix_fcfa)
select p.id, v.sku, v.libelle, v.prix
from (values
  ('lace-glue', 'GD-LG-60', '60 ml', 7000),
  ('lace-glue', 'GD-LG-150', '150 ml', 15000),
  ('lace-melting-spray', 'GD-LMS-180', '180 ml', 5000),
  ('lace-glue-remover-spray', 'GD-LGRS-30', '30 ml', 1000),
  ('wax-stick', 'GD-WS-GF', 'Grand format', 2000)
) as v(slug, sku, libelle, prix)
join public.produits p on p.slug = v.slug
on conflict (sku) do nothing;

-- ---------------------------------------------------------------------------
-- Nouveaux produits. Descriptions tirées des seuls noms fournis : aucune promesse ajoutée.
-- Silkening Mist est créé NON publié : la cliente avait demandé de ne jamais l'afficher ;
-- il sera publié depuis l'administration une fois sa mise en vente confirmée.
-- ---------------------------------------------------------------------------
insert into public.produits (sku, slug, nom, description, categorie_id, type, prix_fcfa, publie, seuil_alerte)
select v.sku, v.slug, v.nom, v.description, c.id, v.type, v.prix, v.publie, 5
from (values
  ('GD-GLG', 'glue-liquid-gel', 'Glue Liquid Gel',
   'Gel de fixation liquide pour la pose de perruque.', 'pose-de-perruque', 'produit', 5000, true),
  ('GD-HSG', 'hair-styling-gel', 'Hair Styling Gel',
   'Gel coiffant.', 'coiffage', 'produit', 3000, true),
  ('GD-SM', 'silkening-mist', 'Silkening Mist',
   'Brume pour les cheveux.', 'coiffage', 'produit', 3000, false),
  ('GD-GAMME', 'la-gamme', 'La gamme Glorious Destiny',
   'Les produits de la gamme réunis en un seul achat.', 'coffret', 'produit', 25000, true),
  ('GD-CEC', 'colle-extension-cils', 'Colle pour extension de cils',
   'Colle pour la pose d’extensions de cils.', 'cils', 'accessoire_cils', 8000, true),
  ('GD-SL10', 'strip-lashes-fluffy-wispy', 'Strip Lashes Fluffy Wispy',
   'Faux cils en bande, effet fluffy wispy. Pack de 10 paires.', 'cils', 'accessoire_cils', 1000, true),
  ('GD-CLB', 'cluster-lashes-box', 'Cluster Lashes Box',
   'Boîte de cils en grappes, de 30P à 100P.', 'cils', 'accessoire_cils', 4000, true),
  ('GD-FLC-1226', 'fluffy-lash-clusters-12-26', 'Fluffy Lash Clusters 12–26 mm',
   'Cils en grappes fluffy, longueurs de 12 à 26 mm, en double plateau.', 'cils', 'accessoire_cils', 4000, true),
  ('GD-FLC-200D', 'fluffy-lash-clusters-200d', 'Fluffy Lash Clusters 200D',
   'Cils en grappes fluffy 200D, longueurs de 14 à 24 mm.', 'cils', 'accessoire_cils', 3000, true),
  ('GD-LEK', 'lash-extension-kit', 'Lash Extension Kit 570 pcs',
   'Kit d’extensions de cils de 570 pièces (30D à 100D), avec pince, brosse et colle.', 'cils', 'accessoire_cils', 4000, true),
  ('GD-FLC-CAT', 'fluffy-lash-clusters-cat-eye-100d', 'Fluffy Lash Clusters Cat Eye 100D',
   'Cils en grappes fluffy 100D, effet cat eye, longueurs de 8 à 15 mm.', 'cils', 'accessoire_cils', 3000, true),
  ('GD-FLC-80D', 'fluffy-lash-clusters-80d', 'Fluffy Lash Clusters 80D',
   'Cils en grappes fluffy 80D, longueurs de 10 à 12 mm.', 'cils', 'accessoire_cils', 2500, true)
) as v(sku, slug, nom, description, categorie, type, prix, publie)
join public.categories c on c.slug = v.categorie
on conflict (slug) do nothing;

insert into public.variantes (produit_id, sku, libelle)
select p.id, p.sku || '-STD', v.libelle
from (values
  ('glue-liquid-gel', 'Format standard'),
  ('hair-styling-gel', 'Format standard'),
  ('silkening-mist', 'Format standard'),
  ('la-gamme', 'Format standard'),
  ('colle-extension-cils', 'Format standard'),
  ('strip-lashes-fluffy-wispy', '10 paires'),
  ('cluster-lashes-box', '30P à 100P'),
  ('fluffy-lash-clusters-12-26', 'Double plateau'),
  ('fluffy-lash-clusters-200d', '14 à 24 mm'),
  ('lash-extension-kit', '570 pièces'),
  ('fluffy-lash-clusters-cat-eye-100d', '8 à 15 mm'),
  ('fluffy-lash-clusters-80d', '10 à 12 mm')
) as v(slug, libelle)
join public.produits p on p.slug = v.slug
on conflict (sku) do nothing;

-- ---------------------------------------------------------------------------
-- Stock initial : 40 par nouveau format, par mouvements d'entrée idempotents.
-- Ce n'est pas un « retour en stock » : la notification d'équipe est suspendue le temps de
-- la migration (le mouvement, lui, est bien journalisé).
-- ---------------------------------------------------------------------------
alter table public.stocks disable trigger stocks_notifier;
select private.appliquer_mouvement_stock(
  var.id, 'entree', 40, 0, 'manuel', null,
  'Stock initial du nouveau format (40, demandé par la cliente)', 'stock-initial-' || var.sku
)
from public.variantes var
where var.sku in (
  'GD-LG-60', 'GD-LG-150', 'GD-LMS-180', 'GD-LGRS-30', 'GD-WS-GF',
  'GD-GLG-STD', 'GD-HSG-STD', 'GD-SM-STD', 'GD-GAMME-STD', 'GD-CEC-STD',
  'GD-SL10-STD', 'GD-CLB-STD', 'GD-FLC-1226-STD', 'GD-FLC-200D-STD', 'GD-LEK-STD',
  'GD-FLC-CAT-STD', 'GD-FLC-80D-STD'
)
order by var.sku;
alter table public.stocks enable trigger stocks_notifier;
