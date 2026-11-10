import { use } from 'react'
import { PanierContext, type ValeurPanier } from './PanierContext'

export function usePanier(): ValeurPanier {
  const valeur = use(PanierContext)
  if (!valeur) throw new Error('usePanier doit être utilisé dans <PanierProvider>')
  return valeur
}
