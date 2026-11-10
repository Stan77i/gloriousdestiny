import { createContext } from 'react'
import type { LignePanier } from './panier'

export type ValeurPanier = {
  lignes: LignePanier[]
  nombreArticles: number
  ajouter: (varianteId: string, quantite?: number) => void
  modifier: (varianteId: string, quantite: number) => void
  retirer: (varianteId: string) => void
  vider: () => void
}

export const PanierContext = createContext<ValeurPanier | null>(null)
