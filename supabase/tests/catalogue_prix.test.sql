-- Tests prix et formats du 11/11/2026 : prix exacts par format, stock initial de 40 par
-- mouvement, Silkening Mist publié, une fiche par produit, aucune fausse alerte « retour en stock ».
\set ON_ERROR_STOP 1
begin;
do $$
declare
  attendu jsonb := '{"GD-LG-STD":4000,"GD-LG-60":7000,"GD-LG-150":15000,"GD-LMS-STD":3500,"GD-LMS-180":5000,
    "GD-LGRS-30":1000,"GD-LGRS-STD":2000,"GD-WS-STD":1000,"GD-WS-GF":2000,"GD-GLG-STD":5000,"GD-SM-STD":3000,
    "GD-HSG-STD":3000,"GD-CEC-STD":8000,"GD-GAMME-STD":25000,"GD-SL10-STD":1000,"GD-CLB-STD":4000,
    "GD-FLC-1226-STD":4000,"GD-FLC-200D-STD":3000,"GD-LEK-STD":4000,"GD-FLC-CAT-STD":3000,"GD-FLC-80D-STD":2500}';
  k text;
  prix int;
begin
  for k in select jsonb_object_keys(attendu) loop
    select coalesce(v.prix_fcfa, p.prix_fcfa) into prix
    from public.variantes v join public.produits p on p.id = v.produit_id where v.sku = k;
    assert prix = (attendu ->> k)::int, format('prix de %s : %s au lieu de %s', k, prix, attendu ->> k);
  end loop;
  assert (select count(*) from public.produits where type = 'accessoire_cils' and publie) = 8, '7 cils + colle';
  assert (select min(s.physique) from public.stocks s join public.variantes v on v.id = s.variante_id
          where v.sku in (select jsonb_object_keys(attendu)) and v.sku not in ('GD-LG-STD','GD-LMS-STD','GD-LGRS-STD','GD-WS-STD')) = 40,
    'stock initial de 40 par nouveau format';
  assert (select publie from public.produits where slug = 'silkening-mist'), 'Silkening Mist publié (confirmé par la cliente)';
  assert not exists (select 1 from public.produits where sku like 'GD-%' and publie and (fiche = '{}'::jsonb or fiche ->> 'accroche' is null)), 'chaque produit publié a sa fiche';
  assert not exists (select 1 from public.notifications where type = 'retour_stock'), 'pas de fausse alerte de retour en stock';
end $$;
select 'TESTS CATALOGUE PRIX PASSÉS' as resultat;
rollback;
