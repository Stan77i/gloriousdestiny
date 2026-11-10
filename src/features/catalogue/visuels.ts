import { GAMME } from './gamme'

/**
 * Visuels fournis par le client, rattachés aux produits par leur slug.
 * Provisoire : en Phase 10, les images seront gérées depuis l'administration (Supabase Storage).
 * Un produit ajouté plus tard sans visuel local affiche un monogramme.
 */
export type VisuelProduit = {
  detoure: string | null
  photo: { petite: string; grande: string; alt: string } | null
}

const PAR_SLUG = new Map(GAMME.map((p) => [p.slug, { detoure: p.detoure, photo: p.photo }]))

export function visuelProduit(slug: string): VisuelProduit {
  return PAR_SLUG.get(slug) ?? { detoure: null, photo: null }
}
