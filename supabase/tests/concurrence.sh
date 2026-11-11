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

# Deux réservations simultanées du MÊME créneau : une seule doit réussir
# (la contrainte d'exclusion tranche, même si les deux ont vu le créneau libre).
CRENEAU=$("${PSQL[@]}" -t -A -c "select min(c) from public.creneaux_disponibles((select id from public.services where slug = 'pose-de-cils'), (now() at time zone 'Africa/Douala')::date + 7, (now() at time zone 'Africa/Douala')::date + 13) c")
reservation() {
  "${PSQL[@]}" -t -A <<SQL 2>&1 || true
set role anon;
select public.reserver_rendez_vous(jsonb_build_object(
  'cle_idempotence', 'test-concurrence-rdv-$1',
  'service_id', (select id from public.services where slug = 'pose-de-cils'),
  'debut', '$CRENEAU',
  'cliente', jsonb_build_object('nom', 'Cliente $1', 'telephone', '+23769000050$1')
)) ->> 'reference';
SQL
}
reservation 1 > /tmp/gd-rdv-1 & reservation 2 > /tmp/gd-rdv-2 & wait
succes=$(grep -lE '^RDV-' /tmp/gd-rdv-1 /tmp/gd-rdv-2 | wc -l)
refus=$(grep -l 'CRENEAU_INDISPONIBLE' /tmp/gd-rdv-1 /tmp/gd-rdv-2 | wc -l)
rm -f /tmp/gd-rdv-1 /tmp/gd-rdv-2
if [ "$succes" = 1 ] && [ "$refus" = 1 ]; then
  echo " TEST CONCURRENCE RENDEZ-VOUS PASSÉ (1 réservation acceptée, 1 refusée)"
else
  echo " ECHEC concurrence rendez-vous : succès=$succes refus=$refus" >&2
  exit 1
fi

# Une réservation et un blocage SIMULTANÉS sur la même plage : jamais les deux.
"${PSQL[@]}" <<'SQL'
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000c0c0', 'ventes-course@test.local') on conflict do nothing;
insert into public.profiles (id, nom, role) values ('00000000-0000-0000-0000-00000000c0c0', 'Ventes', 'ventes') on conflict do nothing;
SQL
CRENEAU2=$("${PSQL[@]}" -t -A -c "select max(c) from public.creneaux_disponibles((select id from public.services where slug = 'pose-de-cils'), (now() at time zone 'Africa/Douala')::date + 7, (now() at time zone 'Africa/Douala')::date + 13) c")
reserve() {
  "${PSQL[@]}" -t -A <<SQL 2>&1 || true
set role anon;
select public.reserver_rendez_vous(jsonb_build_object(
  'cle_idempotence', 'test-course-blocage-1',
  'service_id', (select id from public.services where slug = 'pose-de-cils'),
  'debut', '$CRENEAU2',
  'cliente', jsonb_build_object('nom', 'Cliente course', 'telephone', '+237690000777')
)) ->> 'reference';
SQL
}
bloque() {
  "${PSQL[@]}" -t -A <<SQL 2>&1 || true
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000c0c0';
select 'BLOC-' || public.bloquer_creneau('$CRENEAU2'::timestamptz, '$CRENEAU2'::timestamptz + interval '1 hour', 'Course');
SQL
}
reserve > /tmp/gd-course-1 & bloque > /tmp/gd-course-2 & wait
rdv=$(grep -cE '^RDV-' /tmp/gd-course-1 || true)
bloc=$(grep -cE '^BLOC-' /tmp/gd-course-2 || true)
rm -f /tmp/gd-course-1 /tmp/gd-course-2
if [ $((rdv + bloc)) = 1 ]; then
  echo " TEST CONCURRENCE BLOCAGE PASSÉ (réservation=$rdv, blocage=$bloc : jamais les deux)"
else
  echo " ECHEC course blocage : réservation=$rdv blocage=$bloc" >&2
  exit 1
fi
