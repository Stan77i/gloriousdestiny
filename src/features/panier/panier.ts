import { z } from 'zod'

/**
 * Panier local (architecture, section E6) : uniquement des identifiants de variantes
 * et des quantités. Aucun prix ni stock n'y est stocké : tout est relu depuis la base,
 * et revérifié par le serveur au moment de la commande.
 */
export const QUANTITE_MAX = 20

const schemaLigne = z.object({
  varianteId: z.uuid(),
  quantite: z.number().int().min(1).max(QUANTITE_MAX),
})
const schemaPanier = z.object({ version: z.literal(1), lignes: z.array(schemaLigne).max(50) })

export type LignePanier = z.infer<typeof schemaLigne>

export type ActionPanier =
  | { type: 'ajouter'; varianteId: string; quantite: number }
  | { type: 'modifier'; varianteId: string; quantite: number }
  | { type: 'retirer'; varianteId: string }
  | { type: 'vider' }
  | { type: 'remplacer'; lignes: LignePanier[] }

const borner = (q: number) => Math.min(QUANTITE_MAX, Math.max(0, Math.trunc(q)))

export function reduirePanier(lignes: LignePanier[], action: ActionPanier): LignePanier[] {
  switch (action.type) {
    case 'ajouter': {
      const existante = lignes.find((l) => l.varianteId === action.varianteId)
      if (existante) {
        return lignes.map((l) =>
          l.varianteId === action.varianteId
            ? { ...l, quantite: borner(l.quantite + action.quantite) || 1 }
            : l,
        )
      }
      const quantite = borner(action.quantite)
      return quantite > 0 ? [...lignes, { varianteId: action.varianteId, quantite }] : lignes
    }
    case 'modifier': {
      const quantite = borner(action.quantite)
      if (quantite === 0) return lignes.filter((l) => l.varianteId !== action.varianteId)
      return lignes.map((l) => (l.varianteId === action.varianteId ? { ...l, quantite } : l))
    }
    case 'retirer':
      return lignes.filter((l) => l.varianteId !== action.varianteId)
    case 'vider':
      return []
    case 'remplacer':
      return action.lignes
  }
}

/** Date de la dernière modification du panier (ISO). */
export const CLE_PANIER_MAJ = 'gd-panier-maj'
export const CLE_STOCKAGE = 'gd-panier'

/** Lecture tolérante : un contenu corrompu ou d'un ancien format donne un panier vide. */
export function lirePanier(brut: string | null): LignePanier[] {
  if (!brut) return []
  try {
    const resultat = schemaPanier.safeParse(JSON.parse(brut))
    return resultat.success ? resultat.data.lignes : []
  } catch {
    return []
  }
}

export function ecrirePanier(lignes: LignePanier[]): string {
  return JSON.stringify({ version: 1, lignes })
}
