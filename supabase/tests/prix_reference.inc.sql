-- Prix de référence des tests métier (prix du catalogue initial) : les tests vérifient les
-- calculs, pas le tarif du moment. Inclus en début de transaction, annulé par le rollback.
update public.produits set prix_fcfa = v.prix
from (values ('lace-glue', 9500), ('lace-melting-spray', 8000), ('lace-glue-remover-spray', 5500), ('wax-stick', 5000)) as v(slug, prix)
where produits.slug = v.slug;
update public.variantes set prix_fcfa = null where sku in ('GD-LG-STD', 'GD-LMS-STD', 'GD-LGRS-STD', 'GD-WS-STD');
update public.variantes set libelle = 'Format standard' where sku in ('GD-LG-STD', 'GD-LMS-STD', 'GD-WS-STD');
