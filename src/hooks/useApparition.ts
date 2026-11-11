import { useEffect, useRef, useState } from 'react'

/**
 * Révélation unique à l'entrée dans l'écran. Le contenu reste visible par défaut : l'état
 * « non » n'est posé que par le script, pour un élément encore hors de la vue.
 */
export function useApparition<T extends Element>() {
  const ref = useRef<T>(null)
  const [etat, setEtat] = useState<'oui' | 'non' | undefined>(undefined)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setEtat('oui')
          obs.disconnect()
        } else {
          setEtat((x) => x ?? 'non')
        }
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
    }
  }, [])
  return { ref, etat }
}
