/**
 * Une teinte douce par univers de la marque. Elle colore les fonds (socle des produits,
 * cartes, pastilles), jamais le texte : l'encre reste lisible dessus dans les deux thèmes.
 */
export type Teinte = 'rose' | 'lilas' | 'sauge' | 'sable'

export const FOND_TEINTE: Record<Teinte, string> = {
  rose: 'bg-rose',
  lilas: 'bg-lilas',
  sauge: 'bg-sauge',
  sable: 'bg-sable',
}

/** Perruques : rose poudré. Cils : lilas. Produits de pose : sauge. Salon : sable. */
export const TEINTE_TYPE_PRODUIT: Record<'perruque' | 'produit' | 'accessoire_cils', Teinte> = {
  perruque: 'rose',
  accessoire_cils: 'lilas',
  produit: 'sauge',
}
export const TEINTE_SALON: Teinte = 'sable'
