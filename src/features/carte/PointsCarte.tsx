import { useMemo } from 'react'
import type { Grille } from './projection'

/** Terres en points discrets, pays desservis en or. */
export function PointsCarte({ g, rayon = 0.34 }: { g: Grille; rayon?: number }) {
  const cercles = useMemo(() => {
    const liste = []
    for (let k = 0; k < g.points.length; k += 3) {
      const desservi = (g.points[k + 2] ?? 0) > 0
      liste.push(
        <circle
          key={k}
          cx={g.points[k]}
          cy={g.points[k + 1]}
          r={rayon}
          className={desservi ? 'fill-or' : 'fill-encre-3'}
          opacity={desservi ? 0.85 : 0.28}
        />,
      )
    }
    return liste
  }, [g, rayon])
  return <g>{cercles}</g>
}
