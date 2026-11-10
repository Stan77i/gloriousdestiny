const formateur = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/**
 * Montant en FCFA (XAF et XOF ont la même valeur et le même affichage).
 * Les montants sont des entiers : toute valeur non entière est une erreur de programmation.
 */
export function formaterFcfa(montant: number): string {
  if (!Number.isInteger(montant)) throw new RangeError(`Montant non entier : ${montant}`)
  // Intl insère une espace fine insécable entre les milliers.
  return `${formateur.format(montant)} FCFA`
}
