import type { Disponibilite, Produit, Variante } from '@/services/catalogue.service'

/** Format affiché par défaut : le premier en promotion réelle, sinon le plus petit. */
export function formatAffiche(p: Produit): Variante | undefined {
  return p.variantes.find((v) => v.promo) ?? p.variantes[0]
}

export function reductionMax(p: Produit): number | undefined {
  const r = p.variantes.flatMap((v) => (v.promo ? [v.promo.reduction] : []))
  return r.length > 0 ? Math.max(...r) : undefined
}

/** Disponibilité d'un produit : disponible si l'un de ses formats l'est. */
export function statutProduit(
  p: Produit,
  dispo: Map<string, Disponibilite> | undefined,
): Disponibilite | undefined {
  if (!dispo) return undefined
  const s = p.variantes.map((v) => dispo.get(v.id) ?? 'epuise')
  if (s.includes('disponible')) return 'disponible'
  if (s.includes('bientot_epuise')) return 'bientot_epuise'
  return 'epuise'
}

/** Teinte de l'univers d'un produit (fond uniquement). */
export function teinteUnivers(categorie: string): string {
  if (categorie === 'cils') return 'bg-lilas'
  if (categorie === 'perruques') return 'bg-rose'
  if (categorie === 'coffret') return 'bg-sable'
  return 'bg-sauge'
}
