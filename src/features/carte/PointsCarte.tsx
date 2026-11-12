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
  return (
    <g>
      {/* Côtes et frontières tracées au fil fin : on lit chaque pays d'un coup d'œil. */}
      {g.cotes && (
        <path
          d={g.cotes}
          fill="none"
          className="stroke-encre-2"
          strokeWidth={1}
          strokeOpacity={0.45}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {g.frontieres && (
        <path
          d={g.frontieres}
          fill="none"
          className="stroke-or"
          strokeWidth={1.3}
          strokeOpacity={0.9}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {cercles}
    </g>
  )
}
