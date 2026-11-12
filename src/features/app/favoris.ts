import { useSyncExternalStore } from 'react'

/**
 * Favoris de la visiteuse (identifiants de produits), gardés sur cet appareil. Le même cœur
 * ajoute et retire (règle de l'antagoniste).
 */
const CLE = 'gd-favoris'
let liste: string[] = []
try {
  const brut = localStorage.getItem(CLE)
  const lu: unknown = brut ? JSON.parse(brut) : []
  if (Array.isArray(lu)) liste = lu.filter((x): x is string => typeof x === 'string').slice(0, 100)
} catch {
  /* stockage indisponible ou illisible : aucun favori */
}

const abonnes = new Set<() => void>()

export function basculerFavori(id: string): boolean {
  const present = liste.includes(id)
  liste = present ? liste.filter((x) => x !== id) : [...liste, id]
  try {
    localStorage.setItem(CLE, JSON.stringify(liste))
  } catch {
    /* sans stockage, les favoris valent pour cette visite */
  }
  abonnes.forEach((f) => {
    f()
  })
  return !present
}

function abonner(f: () => void) {
  abonnes.add(f)
  return () => {
    abonnes.delete(f)
  }
}

export function useFavoris(): string[] {
  return useSyncExternalStore(
    abonner,
    () => liste,
    () => liste,
  )
}
