import { useCallback } from 'react'

/**
 * Révélation au défilement, avec un seul IntersectionObserver pour toute la page.
 * Le contenu reste visible par défaut : seul un élément encore sous l'écran reçoit
 * data-revele="cache", puis "vu" à son entrée (une fois). Mouvement réduit : rien ne se cache.
 */
let observateur: IntersectionObserver | null = null

function obtenir(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  observateur ??= new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-revele', 'vu')
          observateur?.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  return observateur
}

/** Ref à poser sur l'élément ; `indice` décale les éléments d'une même section. */
export function useRevele(indice = 0) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return
      const obs = obtenir()
      if (!obs || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      el.style.setProperty('--i', String(indice))
      // Déjà à l'écran (ou au-dessus) au montage : on ne le cache pas.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return
      el.setAttribute('data-revele', 'cache')
      obs.observe(el)
      return () => {
        obs.unobserve(el)
      }
    },
    [indice],
  )
}
