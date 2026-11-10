import { useSyncExternalStore } from 'react'

function abonner(rappel: () => void) {
  window.addEventListener('online', rappel)
  window.addEventListener('offline', rappel)
  return () => {
    window.removeEventListener('online', rappel)
    window.removeEventListener('offline', rappel)
  }
}

/** État réseau du navigateur. Sert à prévenir la cliente avant une action qui exige le réseau (PWA). */
export function useEnLigne(): boolean {
  return useSyncExternalStore(
    abonner,
    () => navigator.onLine,
    () => true,
  )
}
