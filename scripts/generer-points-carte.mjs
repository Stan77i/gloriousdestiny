// Génère les grilles de points de la carte (terres, Cameroun, Côte d'Ivoire) à partir des données
// géographiques libres Natural Earth (paquet world-atlas, 1:50m). Exécuter après un changement
// de zones : node scripts/generer-points-carte.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { geoContains } from 'd3-geo'
import { feature } from 'topojson-client'

const monde = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'))
const pays = feature(monde, monde.objects.countries).features
const terres = feature(monde, monde.objects.land)
// Codes ISO 3166 numériques : 120 Cameroun, 384 Côte d'Ivoire.
const CODES = { CM: '120', CI: '384' }
const cm = pays.find((p) => p.id === CODES.CM)
const ci = pays.find((p) => p.id === CODES.CI)

const VUES = {
  monde: { lon: [-170, 190], lat: [-56, 76], pas: 2.4 },
  afrique: { lon: [-19, 31], lat: [-7, 24], pas: 0.62 },
  CM: { lon: [7.6, 17.2], lat: [1, 13.6], pas: 0.21 },
  CI: { lon: [-9, -2], lat: [4, 11], pas: 0.155 },
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
      const code = geoContains(cm, p) ? 1 : geoContains(ci, p) ? 2 : 0
      points.push(i, j, code)
    }
  }
  sortie[nom] = { lon: v.lon, lat: v.lat, pas: v.pas, colonnes, lignes, points }
  console.log(`${nom} : ${points.length / 3} points`)
}
writeFileSync('src/features/carte/points-carte.json', JSON.stringify(sortie))
