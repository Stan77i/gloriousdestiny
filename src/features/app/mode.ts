import { useSyncExternalStore } from 'react'

/**
 * Site ou application : détection automatique de l'appareil.
 * - Téléphone (écran étroit, ou écran tactile de tablette en portrait) : l'application.
 * - Ordinateur : le site.
 * La visiteuse peut basculer elle-même (« Version ordinateur » ↔ « Version application »,
 * même lien, geste inverse) ; ce choix est gardé sur l'appareil.
 */
export type Affichage = 'app' | 'site'
type Choix = Affichage | 'auto'

const CLE = 'gd-affichage'
const REQUETE = '(max-width: 767.98px), (pointer: coarse) and (max-width: 1024px)'

let choix: Choix = 'auto'
try {
  const brut = localStorage.getItem(CLE)
  if (brut === 'app' || brut === 'site') choix = brut
} catch {
  /* stockage indisponible : détection seule */
}

const abonnes = new Set<() => void>()
const prevenir = () => {
  abonnes.forEach((f) => {
    f()
  })
}

function media(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REQUETE)
    : null
}

export function affichageDetecte(): Affichage {
  return media()?.matches ? 'app' : 'site'
}

export function affichageActuel(): Affichage {
  return choix === 'auto' ? affichageDetecte() : choix
}

/** Bascule site ↔ application. Revenir au mode détecté efface le choix. */
export function basculerAffichage() {
  const suivant: Affichage = affichageActuel() === 'app' ? 'site' : 'app'
  choix = suivant === affichageDetecte() ? 'auto' : suivant
  try {
    if (choix === 'auto') localStorage.removeItem(CLE)
    else localStorage.setItem(CLE, choix)
  } catch {
    /* sans stockage, le choix vaut pour cette visite */
  }
  prevenir()
}

function abonner(f: () => void) {
  abonnes.add(f)
  const m = media()
  m?.addEventListener('change', f)
  return () => {
    abonnes.delete(f)
    m?.removeEventListener('change', f)
  }
}

export function useAffichage(): Affichage {
  return useSyncExternalStore(abonner, affichageActuel, () => 'site')
}
