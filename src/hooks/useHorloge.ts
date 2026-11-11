import { useSyncExternalStore } from 'react'

/**
 * Horloge partagée : un seul minuteur d'une seconde pour toute la page (comptes à rebours,
 * échéances d'offres), actif seulement tant qu'un composant l'écoute.
 */
let maintenant = Date.now()
const abonnes = new Set<() => void>()
let minuteur: number | undefined

function abonner(rappel: () => void) {
  abonnes.add(rappel)
  if (minuteur === undefined) {
    maintenant = Date.now()
    minuteur = window.setInterval(() => {
      maintenant = Date.now()
      abonnes.forEach((r) => {
        r()
      })
    }, 1000)
  }
  return () => {
    abonnes.delete(rappel)
    if (abonnes.size === 0 && minuteur !== undefined) {
      window.clearInterval(minuteur)
      minuteur = undefined
    }
  }
}

export function useHorloge(): number {
  return useSyncExternalStore(
    abonner,
    () => maintenant,
    () => maintenant,
  )
}
