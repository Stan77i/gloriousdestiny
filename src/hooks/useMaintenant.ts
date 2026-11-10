import { useEffect, useState } from 'react'

/** L'heure actuelle, rafraîchie à intervalle régulier (une minute par défaut). */
export function useMaintenant(intervalleMs = 60_000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setMaintenant(Date.now())
    }, intervalleMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalleMs])
  return maintenant
}
