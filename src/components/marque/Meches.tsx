import { useId } from 'react'
import { useAEcran } from '@/hooks/useAEcran'
import { cx } from '@/lib/cx'

/**
 * Mèches : une chevelure longue dessinée au fil d'or. Les mèches apparaissent l'une après
 * l'autre (tracé progressif), puis ondulent doucement, chacune à son rythme, comme des
 * cheveux portés par l'air. Seules les transformations sont animées (léger) ; l'ondulation
 * s'arrête hors écran ; préférence « mouvement réduit » : les mèches sont simplement là.
 */

// Chaque mèche : une courbe en S qui tombe du sommet, avec sa largeur, son opacité, son rythme.
const MECHES: { d: string; l: number; o: number; t: number }[] = [
  {
    d: 'M300 0 C 250 120, 360 220, 300 340 S 230 560, 300 700 S 360 880, 310 1000',
    l: 1.6,
    o: 0.9,
    t: 7.2,
  },
  {
    d: 'M318 0 C 280 140, 392 240, 330 360 S 262 580, 334 720 S 396 890, 348 1000',
    l: 1.1,
    o: 0.7,
    t: 8.4,
  },
  {
    d: 'M282 0 C 226 110, 330 230, 270 350 S 196 560, 262 700 S 316 870, 268 1000',
    l: 1.2,
    o: 0.75,
    t: 6.6,
  },
  {
    d: 'M336 0 C 312 150, 420 260, 362 380 S 300 600, 372 740 S 436 900, 392 1000',
    l: 0.9,
    o: 0.55,
    t: 9.1,
  },
  {
    d: 'M264 0 C 200 130, 300 250, 240 370 S 160 580, 226 720 S 272 880, 222 1000',
    l: 0.9,
    o: 0.55,
    t: 7.8,
  },
  {
    d: 'M350 0 C 340 160, 450 280, 396 400 S 344 620, 412 760 S 474 910, 436 1000',
    l: 0.7,
    o: 0.4,
    t: 10.2,
  },
  {
    d: 'M246 0 C 172 150, 270 270, 210 390 S 124 600, 190 740 S 230 890, 178 1000',
    l: 0.7,
    o: 0.4,
    t: 8.9,
  },
  {
    d: 'M309 0 C 268 128, 374 232, 314 352 S 246 570, 318 712 S 378 884, 330 1000',
    l: 0.6,
    o: 0.5,
    t: 6.1,
  },
  {
    d: 'M292 0 C 240 116, 344 226, 284 346 S 212 566, 282 706 S 338 876, 290 1000',
    l: 0.6,
    o: 0.5,
    t: 9.6,
  },
]

export function Meches({ className, ton = 'or' }: { className?: string; ton?: 'or' | 'clair' }) {
  const { ref, visible } = useAEcran<SVGSVGElement>()
  const id = `meches-${useId().replace(/:/g, '')}`
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="120 0 380 1000"
      preserveAspectRatio="xMidYMin slice"
      className={cx('meches', !visible && 'meches-pause', className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            stopColor={ton === 'or' ? 'var(--gd-or-clair)' : '#fff8ea'}
            stopOpacity="0"
          />
          <stop offset="0.18" stopColor={ton === 'or' ? 'var(--gd-or-clair)' : '#fff8ea'} />
          <stop offset="0.6" stopColor="var(--gd-or)" />
          <stop offset="1" stopColor="var(--gd-or-profond)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {MECHES.map((m, i) => (
        <g
          key={m.d}
          className="meche"
          style={{
            animationDuration: `${String(m.t)}s`,
            animationDelay: `${String(-i * 0.9)}s`,
          }}
        >
          <path
            d={m.d}
            pathLength={1}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={m.l}
            strokeLinecap="round"
            opacity={m.o}
            className="meche-trace"
            style={{ animationDelay: `${String(0.15 + i * 0.12)}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
