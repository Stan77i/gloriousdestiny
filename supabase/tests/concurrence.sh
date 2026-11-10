#!/usr/bin/env bash
# Deux commandes simultanées sur la DERNIÈRE unité : une seule doit réussir.
# Appelé par scripts/test-db.sh avec la commande psql en argument.
set -euo pipefail
PSQL=("$@")
"${PSQL[@]}" <<'SQL'
insert into public.produits (sku, slug, nom, categorie_id, type, prix_fcfa, publie)
select 'TEST-DERNIER', 'test-dernier', 'Produit test dernière unité', id, 'produit', 1000, true
from public.categories where slug = 'coiffage';
insert into public.variantes (produit_id, sku, libelle)
select id, 'TEST-DERNIER-1', 'Unique' from public.produits where sku = 'TEST-DERNIER';
select private.appliquer_mouvement_stock(id, 'entree', 1, 0, 'manuel', null, null, 'test-dernier-entree')
from public.variantes where sku = 'TEST-DERNIER-1';
SQL
commande() {
  "${PSQL[@]}" -t -A <<SQL 2>&1 || true
set role anon;
select public.creer_commande(jsonb_build_object(
  'cle_idempotence', 'test-concurrence-$1',
  'cliente', jsonb_build_object('nom', 'Cliente $1', 'telephone', '+23769000030$1'),
  'adresse', jsonb_build_object('ville_id', (select id from public.villes where nom = 'Douala'),
    'quartier', 'Akwa', 'point_de_repere', 'Rond-point'),
  'lignes', jsonb_build_array(jsonb_build_object(
    'variante_id', (select id from public.variantes where sku = 'TEST-DERNIER-1'), 'quantite', 1))
)) ->> 'reference';
SQL
}
commande 1 > /tmp/gd-concurrence-1 & commande 2 > /tmp/gd-concurrence-2 & wait
succes=$(grep -lE '^GD-' /tmp/gd-concurrence-1 /tmp/gd-concurrence-2 | wc -l)
refus=$(grep -l 'STOCK_INSUFFISANT' /tmp/gd-concurrence-1 /tmp/gd-concurrence-2 | wc -l)
etat=$("${PSQL[@]}" -t -A -c "select physique || '/' || reserve from public.stocks s join public.variantes v on v.id = s.variante_id where v.sku = 'TEST-DERNIER-1'")
rm -f /tmp/gd-concurrence-1 /tmp/gd-concurrence-2
if [ "$succes" = 1 ] && [ "$refus" = 1 ] && [ "$etat" = "1/1" ]; then
  echo " TEST CONCURRENCE PASSÉ (1 commande acceptée, 1 refusée, stock 1/1)"
else
  echo " ECHEC concurrence : succès=$succes refus=$refus stock=$etat" >&2
  exit 1
fi
