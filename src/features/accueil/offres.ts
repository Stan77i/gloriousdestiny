import type { Produit } from '@/services/catalogue.service'

/** L'offre réelle qui se termine le plus tôt (pour le compte à rebours), s'il y en a une. */
export function prochaineFin(produits: Produit[] | undefined) {
  const candidates = (produits ?? []).flatMap((p) =>
    p.variantes.flatMap((v) =>
      v.promo?.fin
        ? [{ fin: v.promo.fin, libelle: v.promo.libelle, nom: p.nom, reduction: v.promo.reduction }]
        : [],
    ),
  )
  candidates.sort((a, b) => a.fin.localeCompare(b.fin))
  const c = candidates[0]
  if (!c) return null
  return { ...c, titre: `${c.libelle ?? 'Offre spéciale'} — fin dans` }
}
