/** Graduation « propre » de l'axe : 4 intervalles arrondis (1, 2, 2,5, 5 × 10ⁿ). */
export function graduations(max: number, intervalles = 4): number[] {
  if (max <= 0) return [0]
  const brut = max / intervalles
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? 10 * puissance
  const haut = Math.ceil(max / pas) * pas
  return Array.from({ length: Math.round(haut / pas) + 1 }, (_, i) => i * pas)
}
