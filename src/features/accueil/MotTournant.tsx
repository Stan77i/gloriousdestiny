import { useEffect, useState } from 'react'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'

/**
 * Dernier mot du titre qui change, comme une respiration : « sublimée », « révélée »… Les
 * mots partagent la même case (la largeur ne saute pas). Lecteurs d'écran : le premier mot
 * seulement. Mouvement réduit : le premier mot, fixe.
 */
export function MotTournant({ mots, className }: { mots: string[]; className?: string }) {
  const reduit = useMouvementReduit()
  const [rang, setRang] = useState(0)
  useEffect(() => {
    if (reduit || mots.length < 2) return
    const t = window.setInterval(() => {
      setRang((r) => (r + 1) % mots.length)
    }, 2800)
    return () => {
      window.clearInterval(t)
    }
  }, [reduit, mots.length])
  return (
    <span className={className}>
      <span className="sr-only">{mots[0]}</span>
      <span aria-hidden="true" className="inline-grid">
        {mots.map((m, i) => (
          <span
            key={m}
            className={
              i === rang
                ? 'mot-tournant col-start-1 row-start-1'
                : 'invisible col-start-1 row-start-1'
            }
          >
            {m}
          </span>
        ))}
      </span>
    </span>
  )
}
