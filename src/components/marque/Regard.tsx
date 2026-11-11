import { cx } from '@/lib/cx'
import { useAEcran } from '@/hooks/useAEcran'

/**
 * Regard : un œil dessiné au fil d'or. La paupière se trace, les cils poussent un à un du coin
 * interne vers le coin externe (plus longs à l'extérieur, comme un effet cat eye), puis le
 * regard cligne doucement de temps en temps. Hors écran : pause ; mouvement réduit : dessin fixe.
 */

// Cils : point d'ancrage sur la paupière (x, y) et direction (angle en degrés), longueur.
const CILS = Array.from({ length: 21 }, (_, i) => {
  const t = i / 20
  // Paupière supérieure : courbe de (40, 120) à (360, 112), sommet vers (200, 52).
  const x = 40 + t * 320
  const y = 120 - Math.sin(t * Math.PI) * 66 - t * 8
  const angle = -150 + t * 120
  const longueur = 26 + t * 34 + Math.sin(t * Math.PI) * 10
  return { x, y, angle, longueur, delai: 0.55 + i * 0.045 }
})

export function Regard({ className }: { className?: string }) {
  const { ref, visible } = useAEcran<SVGSVGElement>()
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="0 0 400 220"
      className={cx('regard', !visible && 'regard-pause', className)}
    >
      <g className="regard-paupiere" fill="none" stroke="var(--gd-or)" strokeLinecap="round">
        {/* Paupière supérieure (trait épais, comme un eye-liner), puis inférieure. */}
        <path
          d="M40 120 C 110 40, 290 30, 360 112"
          strokeWidth={4}
          pathLength={1}
          className="regard-trace"
        />
        <path
          d="M52 124 C 130 178, 290 176, 352 116"
          strokeWidth={1.4}
          opacity={0.7}
          pathLength={1}
          className="regard-trace"
          style={{ animationDelay: '0.2s' }}
        />
        <circle cx={200} cy={112} r={34} strokeWidth={1.4} opacity={0.75} className="regard-iris" />
        <circle
          cx={200}
          cy={112}
          r={13}
          fill="var(--gd-or)"
          stroke="none"
          className="regard-iris"
        />
        <circle
          cx={208}
          cy={104}
          r={4}
          fill="var(--gd-or-clair)"
          stroke="none"
          className="regard-iris"
        />
        {CILS.map((c) => (
          <line
            key={c.x}
            x1={c.x}
            y1={c.y}
            x2={c.x + Math.cos((c.angle * Math.PI) / 180) * c.longueur}
            y2={c.y + Math.sin((c.angle * Math.PI) / 180) * c.longueur}
            strokeWidth={1.6}
            pathLength={1}
            className="regard-cil"
            style={{ animationDelay: `${c.delai.toFixed(2)}s` }}
          />
        ))}
      </g>
    </svg>
  )
}
