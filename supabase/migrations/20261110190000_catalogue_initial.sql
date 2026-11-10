-- Glorious Destiny — catalogue initial (Phase 4).
-- Les 7 produits officiels (brief client, aucun autre). Descriptions tirées des étiquettes.
-- PRIX ET STOCK PROVISOIRES fixés à la demande du client le 10/11/2026 (« mets tes prix,
-- on les changera après ») : à remplacer depuis l'administration.
-- Le stock initial passe par des mouvements « entree » (jamais d'écriture directe).

-- Emplacement de stock (déjà créé par le seed sur un projet existant)
insert into public.emplacements (code, nom) values ('principal', 'Stock principal')
on conflict (code) do nothing;

-- Catégories
insert into public.categories (slug, nom, type, ordre, publiee) values
  ('perruques', 'Perruques', 'perruque', 1, true),
  ('pose-de-perruque', 'Pose de perruque', 'produit', 2, true),
  ('coiffage', 'Coiffage', 'produit', 3, true),
  ('cils', 'Cils', 'cils', 4, true)
on conflict (slug) do nothing;

-- Produits
insert into public.produits (sku, slug, nom, description, categorie_id, type, prix_fcfa, publie, seuil_alerte)
select v.sku, v.slug, v.nom, v.description, c.id, 'produit', v.prix, true, 5
from (values
  ('GD-HCM', 'hair-curl-mousse', 'Hair Curl Mousse',
   'Mousse coiffante pour boucles : définit tous les types de boucles, tenue longue durée, sans résidus blancs. Apporte brillance et hydratation.',
   'coiffage', 6500),
  ('GD-GRRS', 'glue-residue-remover-shampoo', 'Glue Residue Remover Shampoo',
   'Shampoing qui élimine les résidus de colle laissés par la pose de perruque, sur les cheveux comme sur la dentelle.',
   'pose-de-perruque', 7500),
  ('GD-LMS', 'lace-melting-spray', 'Lace Melting Spray',
   'Spray qui fond la dentelle dans la peau pour une pose invisible. Séchage rapide, tenue ultra forte, adapté à la pose sans colle.',
   'pose-de-perruque', 8000),
  ('GD-LG', 'lace-glue', 'Lace Glue',
   'Colle pour dentelle de perruque. Séchage rapide, tenue ultra forte.',
   'pose-de-perruque', 9500),
  ('GD-WS', 'wax-stick', 'Wax Stick',
   'Cire en stick pour lisser les contours et discipliner les mèches. Tenue extrême, idéale pour les tresses, locks et twists.',
   'coiffage', 5000),
  ('GD-LGRS', 'lace-glue-remover-spray', 'Lace Glue Remover Spray',
   'Spray dissolvant à action rapide pour retirer la colle et décoller la perruque en douceur.',
   'pose-de-perruque', 5500),
  ('GD-BG', 'braid-gel', 'Braid Gel',
   'Gel de tressage à tenue extrême pour cornrows, locks et twists.',
   'coiffage', 6000)
) as v(sku, slug, nom, description, categorie, prix)
join public.categories c on c.slug = v.categorie
on conflict (slug) do nothing;

-- Une variante par produit (format du brief ; formats non précisés laissés « Format standard »)
insert into public.variantes (produit_id, sku, libelle)
select p.id, p.sku || '-STD', v.libelle
from (values
  ('hair-curl-mousse', '200 ml'),
  ('glue-residue-remover-shampoo', '245 ml'),
  ('lace-melting-spray', 'Format standard'),
  ('lace-glue', 'Format standard'),
  ('wax-stick', 'Format standard'),
  ('lace-glue-remover-spray', '50 ml'),
  ('braid-gel', '250 g')
) as v(slug, libelle)
join public.produits p on p.slug = v.slug
on conflict (sku) do nothing;

-- Stock initial provisoire, par mouvements d'entrée idempotents
select private.appliquer_mouvement_stock(
  var.id, 'entree', v.quantite, 0, 'manuel', null,
  'Stock initial provisoire (à remplacer par l''inventaire réel)', 'stock-initial-' || var.sku
)
from (values
  ('GD-HCM-STD', 20), ('GD-GRRS-STD', 15), ('GD-LMS-STD', 18), ('GD-LG-STD', 25),
  ('GD-WS-STD', 30), ('GD-LGRS-STD', 12), ('GD-BG-STD', 16)
) as v(sku, quantite)
join public.variantes var on var.sku = v.sku;

-- Services du salon (prix et durées provisoires)
insert into public.services (slug, nom, description, type, duree_minutes, tampon_apres_minutes, prix_fcfa, publie) values
  ('pose-de-perruque', 'Pose de perruque',
   'Pose de votre perruque au salon : préparation, ajustement, collage ou pose sans colle, coiffage de finition.',
   'perruque', 120, 15, 15000, true),
  ('entretien-de-perruque', 'Entretien de perruque',
   'Lavage, soin et remise en forme de votre perruque pour lui rendre tenue et brillance.',
   'perruque', 90, 15, 10000, true),
  ('pose-de-cils', 'Pose de cils',
   'Pose de cils au salon pour un regard intensifié, adaptée à la forme de vos yeux.',
   'cils', 90, 15, 12000, true)
on conflict (slug) do nothing;

-- Horaires provisoires du salon (Douala) : lundi à samedi, 9 h – 18 h
insert into public.disponibilites_services (jour_semaine, heure_debut, heure_fin, pas_minutes)
select j, '09:00', '18:00', 30 from generate_series(1, 6) as j
where not exists (select 1 from public.disponibilites_services);

-- Paramètres du salon
insert into public.parametres (cle, valeur, public) values
  ('ville_salon', to_jsonb('Douala, Cameroun'::text), true),
  ('horaires_salon', to_jsonb('Du lundi au samedi, de 9 h à 18 h'::text), true)
on conflict (cle) do nothing;
