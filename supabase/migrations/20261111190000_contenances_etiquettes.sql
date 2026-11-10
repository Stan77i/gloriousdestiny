-- Contenances corrigées d'après les étiquettes (validé par la cliente) :
-- Glue Residue Remover Shampoo 300 ml (et non 245 ml), Hair Curl Mousse 250 ml (et non 200 ml).
update public.variantes v set libelle = '300 ml'
  from public.produits p
  where p.id = v.produit_id and p.slug = 'glue-residue-remover-shampoo' and v.libelle = '245 ml';
update public.variantes v set libelle = '250 ml'
  from public.produits p
  where p.id = v.produit_id and p.slug = 'hair-curl-mousse' and v.libelle = '200 ml';
