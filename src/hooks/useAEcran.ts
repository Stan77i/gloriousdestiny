import { useEffect, useRef, useState } from 'react'

/** Vrai tant que l'élément est à l'écran : les boucles s'arrêtent hors de la vue. */
export function useAEcran<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((e) => {
      setVisible(e.some((x) => x.isIntersecting))
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
    }
  }, [])
  return { ref, visible }
}
