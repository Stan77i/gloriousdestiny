export const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** Vitesse lisible : par jour à partir d'une unité par jour, sinon par semaine. */
export function formaterVitesse(v: number): string {
  return v >= 1 ? `${decimal.format(v)} / jour` : `${decimal.format(v * 7)} / semaine`
}
