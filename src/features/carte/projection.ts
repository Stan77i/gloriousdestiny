/** Grilles de points précalculées (scripts/generer-points-carte.mjs, Natural Earth 1:50m). */
export type Grille = {
  lon: [number, number]
  lat: [number, number]
  pas: number
  colonnes: number
  lignes: number
  /** Triplets à plat : colonne, ligne, code (0 terre, 1 Cameroun, 2 Côte d'Ivoire). */
  points: number[]
}

export type IdVue = 'monde' | 'afrique' | 'CM' | 'CI'

/** Position d'un lieu dans la grille (en unités de grille), ou null s'il sort du cadre. */
export function projeter(
  g: Grille,
  longitude: number,
  latitude: number,
): { x: number; y: number } | null {
  let lon = longitude
  if (lon < g.lon[0]) lon += 360
  const x = (lon - g.lon[0]) / g.pas
  const y = (g.lat[1] - latitude) / g.pas
  if (x < -0.5 || y < -0.5 || x > g.colonnes + 0.5 || y > g.lignes + 0.5) return null
  return { x, y }
}

/** Arc entre deux points : courbe quadratique bombée vers le haut, proportionnelle à la distance. */
export function arc(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  // Normale orientée vers le haut de la carte.
  let nx = -dy / (d || 1)
  let ny = dx / (d || 1)
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const h = d * 0.28
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} Q${(mx + nx * h).toFixed(2)},${(my + ny * h).toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`
}
