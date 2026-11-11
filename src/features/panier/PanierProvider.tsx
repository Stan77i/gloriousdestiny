import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { CLE_PANIER_MAJ, CLE_STOCKAGE, ecrirePanier, lirePanier, reduirePanier } from './panier'
import { PanierContext, type ValeurPanier } from './PanierContext'

function lireStockage() {
  try {
    return lirePanier(window.localStorage.getItem(CLE_STOCKAGE))
  } catch {
    return [] // stockage indisponible (navigation privée stricte) : panier en mémoire
  }
}

/** Panier conservé dans le navigateur, synchronisé entre onglets. */
export function PanierProvider({ children }: { children: ReactNode }) {
  const [lignes, envoyer] = useReducer(reduirePanier, undefined, lireStockage)

  useEffect(() => {
    try {
      const texte = ecrirePanier(lignes)
      // Date de dernière modification réelle (pas au simple rechargement de la page) :
      // sert au rappel « votre panier vous attend », jamais plus d'une fois par contenu.
      if (window.localStorage.getItem(CLE_STOCKAGE) !== texte) {
        window.localStorage.setItem(CLE_PANIER_MAJ, new Date().toISOString())
      }
      window.localStorage.setItem(CLE_STOCKAGE, texte)
    } catch {
      // stockage plein ou refusé : le panier reste valable pour cette visite
    }
  }, [lignes])

  useEffect(() => {
    function surStockage(e: StorageEvent) {
      if (e.key !== CLE_STOCKAGE) return
      envoyer({ type: 'remplacer', lignes: lirePanier(e.newValue) })
    }
    window.addEventListener('storage', surStockage)
    return () => {
      window.removeEventListener('storage', surStockage)
    }
  }, [])

  const valeur = useMemo<ValeurPanier>(
    () => ({
      lignes,
      nombreArticles: lignes.reduce((s, l) => s + l.quantite, 0),
      ajouter: (varianteId, quantite = 1) => {
        envoyer({ type: 'ajouter', varianteId, quantite })
      },
      modifier: (varianteId, quantite) => {
        envoyer({ type: 'modifier', varianteId, quantite })
      },
      retirer: (varianteId) => {
        envoyer({ type: 'retirer', varianteId })
      },
      vider: () => {
        envoyer({ type: 'vider' })
      },
    }),
    [lignes],
  )

  return <PanierContext value={valeur}>{children}</PanierContext>
}
