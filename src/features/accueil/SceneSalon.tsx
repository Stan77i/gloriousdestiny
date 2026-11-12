import { useEffect, useState, type CSSProperties } from 'react'
import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'

/** Ce que dit la coiffeuse, une phrase après l'autre, comme au salon. */
const PAROLES = [
  'Installez-vous, ma belle.',
  'On prépare la ligne frontale…',
  'Un voile de colle, et on plaque.',
  'Quelques baby hair…',
  'Et voilà : sublime !',
]

function Eclat({ x, y, t, d }: { x: number; y: number; t: number; d: number }) {
  return (
    <path
      className="scene-eclat"
      style={{ '--d': `${String(d)}s` } as CSSProperties}
      d={`M${String(x)} ${String(y - t)} Q ${String(x)} ${String(y)} ${String(x + t)} ${String(y)} Q ${String(x)} ${String(y)} ${String(x)} ${String(y + t)} Q ${String(x)} ${String(y)} ${String(x - t)} ${String(y)} Q ${String(x)} ${String(y)} ${String(x)} ${String(y - t)} Z`}
      fill="var(--gd-or-clair)"
      stroke="none"
    />
  )
}

/**
 * Scène du premier écran, au fil d'or (même dessin que l'œil des cils) : une cliente assise
 * dans le fauteuil, la coiffeuse debout qui la coiffe. Le dessin se trace à l'apparition ; puis
 * la main au peigne descend le long des cheveux, les mèches ondulent, des éclats scintillent,
 * et la coiffeuse parle dans une bulle. Décorative (la phrase est aussi lue une fois).
 * Mouvement réduit : scène déjà dessinée, immobile, une seule phrase.
 */
export function SceneSalon({ className }: { className?: string }) {
  const reduit = useMouvementReduit()
  const [rang, setRang] = useState(0)

  useEffect(() => {
    if (reduit) return
    const t = window.setInterval(() => {
      setRang((r) => (r + 1) % PAROLES.length)
    }, 3400)
    return () => {
      window.clearInterval(t)
    }
  }, [reduit])

  // Ordre de tracé : chaque trait reçoit son retard (en secondes).
  const tr = (d: number) => ({ pathLength: 1, style: { '--d': `${String(d)}s` } as CSSProperties })

  return (
    <div className={cx('scene-salon relative', className)}>
      <svg
        viewBox="0 0 420 470"
        aria-hidden="true"
        className="block size-full overflow-visible"
        fill="none"
        stroke="var(--gd-or)"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Halo doux derrière la scène */}
        <ellipse cx={215} cy={290} rx={190} ry={170} fill="url(#halo-salon)" stroke="none" />
        <defs>
          <radialGradient id="halo-salon">
            <stop offset="0" stopColor="#d6a756" stopOpacity={0.16} />
            <stop offset="1" stopColor="#d6a756" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Le fauteuil */}
        <g className="scene-trait">
          <ellipse cx={175} cy={448} rx={78} ry={11} {...tr(0.1)} />
          <path d="M175 448 V 398" {...tr(0.25)} />
          <path d="M150 398 h 50" {...tr(0.3)} />
          <path d="M98 392 Q 175 410 252 392 L 246 368 Q 175 382 104 368 Z" {...tr(0.4)} />
          <path
            d="M226 372 L 236 262 Q 238 244 254 244 Q 270 244 270 262 L 262 380"
            {...tr(0.55)}
          />
          <path d="M92 352 Q 96 340 110 340 H 168" {...tr(0.7)} />
        </g>

        {/* La cliente : cape de salon, visage de profil, yeux fermés, jambes croisées */}
        <g className="scene-trait">
          <path d="M146 246 Q 168 236 196 246 L 236 372 Q 176 386 108 374 Z" {...tr(0.9)} />
          <path
            d="M120 374 q 8 8 16 0 q 8 8 16 0 q 8 8 16 0 q 8 8 16 0 q 8 8 16 0 q 8 8 16 0"
            strokeOpacity={0.55}
            {...tr(1.05)}
          />
          <path d="M160 222 L 162 244 M182 222 L 180 244" {...tr(1.1)} />
          <path
            d="M172 160 C 148 160 138 178 140 194 C 136 198 132 204 138 206 C 138 214 142 222 156 226 C 172 230 194 222 198 196 C 202 172 192 160 172 160 Z"
            {...tr(1.2)}
          />
          <path d="M150 192 q 6 4 12 0" {...tr(1.4)} />
          <path d="M142 214 q 5 2 9 -1" {...tr(1.45)} />
          {/* Jambes, posées sur le repose-pieds */}
          <path d="M132 382 C 128 404 124 424 122 444 h 20" {...tr(1.5)} />
          <path d="M160 384 C 158 406 156 426 156 446 h 20" strokeOpacity={0.8} {...tr(1.6)} />
          <path d="M108 446 H 196" strokeOpacity={0.5} {...tr(1.7)} />
        </g>

        {/* Ses cheveux : longs, ils tombent dans le dos et ondulent */}
        <g className="scene-cheveux">
          {[0, 8, 16, 24].map((o, i) => (
            <path
              key={o}
              d={`M${String(158 + o * 0.6)} ${String(161 + i)} C ${String(196 + o)} ${String(156 + i)} ${String(210 + o)} ${String(196)} ${String(206 + o)} ${String(240)} S ${String(222 + o)} ${String(300)} ${String(214 + o)} ${String(340 + i * 4)}`}
              strokeOpacity={i === 0 ? 1 : 0.55}
              strokeWidth={i === 0 ? 1.9 : 1.2}
              className="scene-trait"
              {...tr(1.3 + i * 0.1)}
            />
          ))}
        </g>

        {/* La coiffeuse, debout derrière */}
        <g className="scene-trait">
          <circle cx={318} cy={86} r={11} {...tr(1.7)} />
          <path
            d="M304 96 C 286 100 282 122 288 138 C 294 154 316 158 328 146 C 340 132 336 104 318 98"
            {...tr(1.8)}
          />
          <path d="M304 126 q 5 3 10 0" {...tr(1.95)} />
          <path d="M308 156 V 168 M322 154 V 168" {...tr(2)} />
          <path d="M286 172 Q 315 162 344 172 L 362 336 Q 314 348 270 336 Z" {...tr(2.1)} />
          <path d="M292 220 H 340" strokeOpacity={0.5} {...tr(2.2)} />
          <path d="M296 340 L 290 448 h -16 M332 342 L 338 448 h 16" {...tr(2.3)} />
          {/* Main qui tient une mèche */}
          <path d="M340 180 C 352 214 330 238 300 250 L 236 262" {...tr(2.4)} />
        </g>

        {/* Bras au peigne : descend le long des cheveux */}
        <g className="scene-bras">
          <path d="M292 182 C 270 188 250 196 232 200" className="scene-trait" {...tr(2.5)} />
          <g className="scene-trait">
            <rect x={200} y={186} width={32} height={9} rx={3} {...tr(2.6)} />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <path key={k} d={`M${String(204 + k * 5)} 195 v 9`} {...tr(2.65)} />
            ))}
          </g>
        </g>

        <Eclat x={118} y={150} t={9} d={0} />
        <Eclat x={250} y={150} t={6} d={1.2} />
        <Eclat x={372} y={232} t={7} d={2.1} />
        <Eclat x={88} y={262} t={5} d={0.6} />
      </svg>

      {/* La coiffeuse parle */}
      <div className="pointer-events-none absolute top-[2%] right-[2%] max-w-[58%] sm:right-[4%]">
        <p
          key={rang}
          className="scene-bulle rounded-[18px] rounded-br-[4px] bg-carte/95 px-3.5 py-2 text-[14px] leading-snug font-medium text-encre shadow-flottant ring-1 ring-or/30 backdrop-blur-sm"
        >
          {PAROLES[rang]}
        </p>
      </div>
    </div>
  )
}
