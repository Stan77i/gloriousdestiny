import { useEffect, useState, type RefObject } from 'react'
import type { IdVue } from './projection'

export type EtatCarte = {
  vue: IdVue
  setVue: (v: IdVue) => void
  choisie: number | null
  setChoisie: (id: number | null) => void
}

export function useEtatCarte(depart: IdVue = 'monde'): EtatCarte {
  // Sur téléphone, la vue Monde est trop petite pour être lisible : on ouvre sur l'Afrique.
  const [vue, setVueBrute] = useState<IdVue>(() =>
    depart === 'monde' && typeof window !== 'undefined' && window.innerWidth < 640
      ? 'afrique'
      : depart,
  )
  const [choisie, setChoisie] = useState<number | null>(null)
  return {
    vue,
    setVue: (v) => {
      setVueBrute(v)
      setChoisie(null)
    },
    choisie,
    setChoisie,
  }
}

/** Vrai dès que l'élément approche de l'écran (chargement différé de la carte). */
export function useVisible(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) setVisible(true)
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
    }
  }, [ref, visible])
  return visible
}
