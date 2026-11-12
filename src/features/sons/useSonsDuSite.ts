import { useEffect, useSyncExternalStore } from 'react'
import {
  abonnerReglages,
  changerReglages,
  deverrouillerAudio,
  jouer,
  lireReglages,
  vibrer,
} from './sons'

/** Réglages sons et vibrations, suivis en direct. */
export function useReglages() {
  const r = useSyncExternalStore(abonnerReglages, lireReglages, lireReglages)
  return { ...r, changer: changerReglages }
}

/**
 * Donne de la vie au site public : un « tic » doux et une vibration brève au toucher des
 * boutons et liens, un « clic » d'interrupteur pour les bascules, un carillon et une double
 * vibration à chaque ajout au panier. Les sons propres (bulle, clavier) sont joués ailleurs.
 */
export function useSonsDuSite() {
  useEffect(() => {
    const toucher = (e: PointerEvent) => {
      deverrouillerAudio()
      const el = e.target instanceof Element ? e.target : null
      if (!el) return
      if (el.closest('[data-son="aucun"]')) return
      if (el.closest('input[type="checkbox"], [role="switch"], [aria-pressed], [role="tab"]')) {
        jouer('bascule')
        vibrer(12)
        return
      }
      if (el.closest('button, a[href], summary, [role="button"], label')) {
        jouer('tic')
        vibrer(6)
      }
    }
    const ajout = () => {
      jouer('ajout')
      vibrer([12, 40, 18])
    }
    document.addEventListener('pointerdown', toucher, { capture: true, passive: true })
    window.addEventListener('panier:ajout', ajout)
    return () => {
      document.removeEventListener('pointerdown', toucher, { capture: true })
      window.removeEventListener('panier:ajout', ajout)
    }
  }, [])
}
