/** Badges d'article (voir BadgesArticle.tsx) : type et choix des badges à afficher. */
export type TypeBadge = 'meilleure-vente' | 'stock-limite' | 'coup-de-coeur' | 'nouveau'

/** Ordre d'importance : on n'en montre que quelques-uns pour garder l'image lisible. */
const ORDRE: TypeBadge[] = ['meilleure-vente', 'stock-limite', 'coup-de-coeur', 'nouveau']

export function choisirBadges(
  b: { meilleureVente: boolean; stockLimite: boolean; coupDeCoeur: boolean; nouveau: boolean },
  max: number,
): TypeBadge[] {
  const actifs: Record<TypeBadge, boolean> = {
    'meilleure-vente': b.meilleureVente,
    'stock-limite': b.stockLimite,
    'coup-de-coeur': b.coupDeCoeur,
    nouveau: b.nouveau,
  }
  return ORDRE.filter((t) => actifs[t]).slice(0, Math.max(0, max))
}
