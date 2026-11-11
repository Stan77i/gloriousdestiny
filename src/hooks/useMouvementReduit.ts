import { useSyncExternalStore } from 'react'

function abonner(rappel: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', rappel)
  return () => {
    mq.removeEventListener('change', rappel)
  }
}

/** Préférence « réduire les animations » du système, suivie en direct. */
export function useMouvementReduit(): boolean {
  return useSyncExternalStore(
    abonner,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}
