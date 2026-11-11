// Génère les grilles de points de la carte (terres et pays desservis) à partir des données
// géographiques libres Natural Earth (paquet world-atlas, 1:50m). Exécuter après un changement
// de pays desservis : node scripts/generer-points-carte.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { geoBounds, geoContains } from 'd3-geo'
import { feature } from 'topojson-client'

const monde = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'))
const pays = feature(monde, monde.objects.countries).features
const terres = feature(monde, monde.objects.land)

// Pays desservis (codes ISO 3166 numériques), dans l'ordre de public.pays. Le code de point
// vaut l'index + 1 ; 0 = autre terre.
const DESSERVIS = [
  ['CM', '120'],
  ['CI', '384'],
  ['GA', '266'],
  ['CG', '178'],
  ['SN', '686'],
  ['GN', '324'],
  ['CA', '124'],
  ['GB', '826'],
]
const formes = DESSERVIS.map(([code, iso]) => {
  const f = pays.find((p) => p.id === iso)
  if (!f) throw new Error(`Pays introuvable : ${code}`)
  return { code, f }
})

const VUES = {
  monde: { lon: [-170, 190], lat: [-56, 76], pas: 2.4 },
  afrique: { lon: [-19, 31], lat: [-7, 24], pas: 0.62 },
}
// Une vue par pays : son emprise, avec une marge, environ 46 colonnes ou lignes au plus court.
const LIMITES = { CA: { lat: [41, 70] } }
for (const { code, f } of formes) {
  let [[o, s], [e, n]] = geoBounds(f)
  if (LIMITES[code]) [s, n] = LIMITES[code].lat
  const marge = Math.max(e - o, n - s) * 0.08
  ;[o, s, e, n] = [o - marge, s - marge, e + marge, n + marge]
  const pas = Math.max(0.05, Math.min(e - o, n - s) / 46)
  VUES[code] = {
    lon: [+o.toFixed(2), +e.toFixed(2)],
    lat: [+s.toFixed(2), +n.toFixed(2)],
    pas: +pas.toFixed(3),
  }
}

const sortie = {}
for (const [nom, v] of Object.entries(VUES)) {
  const colonnes = Math.round((v.lon[1] - v.lon[0]) / v.pas)
  const lignes = Math.round((v.lat[1] - v.lat[0]) / v.pas)
  const points = []
  for (let j = 0; j <= lignes; j++) {
    for (let i = 0; i <= colonnes; i++) {
      // Longitudes au-delà de 180 : reboucle (vue monde centrée sur l'Afrique et l'Europe).
      let lon = v.lon[0] + i * v.pas
      if (lon > 180) lon -= 360
      const lat = v.lat[1] - j * v.pas
      const p = [lon, lat]
      if (!geoContains(terres, p)) continue
      const k = formes.findIndex(({ f }) => geoContains(f, p))
      points.push(i, j, k + 1)
    }
  }
  sortie[nom] = { lon: v.lon, lat: v.lat, pas: v.pas, colonnes, lignes, points }
  console.log(`${nom} : ${colonnes}×${lignes}, ${points.length / 3} points`)
}
writeFileSync('src/features/carte/points-carte.json', JSON.stringify(sortie))
