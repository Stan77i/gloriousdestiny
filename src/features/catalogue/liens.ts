import { CHEMINS } from '@/app/router/chemins'
import type { Produit } from '@/services/catalogue.service'

/** Lien de fiche selon le type de produit (perruque ou produit). */
export function lienProduit(p: Pick<Produit, 'slug' | 'type'>): string {
  return p.type === 'perruque' ? CHEMINS.perruque(p.slug) : CHEMINS.produit(p.slug)
}
