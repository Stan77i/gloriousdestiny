import type { ReactNode } from 'react'
import { useId } from 'react'

/**
 * Illustrations au trait d'or, une par prestation, en attendant les photos.
 * Fixes (aucune animation) et décoratives : le nom de la prestation est écrit à côté.
 */

function PoseFrontale() {
  return (
    <>
      {/* Chevelure longue */}
      <path d="M128 205 C 100 120, 150 62, 200 62 C 250 62, 300 120, 272 205" />
      <path d="M128 205 C 110 280, 122 360, 98 470" />
      <path d="M272 205 C 290 280, 278 360, 302 470" />
      <path d="M138 190 C 118 290, 134 380, 116 470" opacity={0.6} />
      <path d="M262 190 C 282 290, 266 380, 284 470" opacity={0.6} />
      <path d="M150 104 C 132 150, 128 180, 130 206" opacity={0.5} />
      <path d="M250 104 C 268 150, 272 180, 270 206" opacity={0.5} />
      {/* Visage */}
      <path d="M140 214 C 140 300, 170 330, 200 330 C 230 330, 260 300, 260 214" />
      {/* Ligne frontale (lace) : le contour travaillé */}
      <path d="M128 210 C 142 140, 258 140, 272 210" strokeWidth={2.4} />
      <path d="M134 218 C 148 152, 252 152, 266 218" strokeDasharray="1.5 5" opacity={0.8} />
      {/* Baby hair */}
      <path d="M140 222 c -8 2 -9 12 -1 13 c 5 0 6 -6 2 -7" />
      <path d="M260 222 c 8 2 9 12 1 13 c -5 0 -6 -6 -2 -7" />
      {/* Traits du visage */}
      <path d="M166 238 q 11 7 22 0" />
      <path d="M212 238 q 11 7 22 0" />
      <path d="M198 252 q -4 18 4 24" opacity={0.6} />
      <path d="M186 294 q 14 9 28 0" />
      {/* Cou et épaules */}
      <path d="M180 326 L 176 372 C 150 382, 120 400, 104 470" />
      <path d="M220 326 L 224 372 C 250 382, 280 400, 296 470" />
    </>
  )
}

function Goutte({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <path
      d={`M${String(x)} ${String(y - r * 2)} C ${String(x + r * 0.7)} ${String(y - r)}, ${String(x + r)} ${String(y - r * 0.4)}, ${String(x + r)} ${String(y)} a ${String(r)} ${String(r)} 0 0 1 ${String(-2 * r)} 0 C ${String(x - r)} ${String(y - r * 0.4)}, ${String(x - r * 0.7)} ${String(y - r)}, ${String(x)} ${String(y - r * 2)} Z`}
    />
  )
}

function Eclat({ x, y, t }: { x: number; y: number; t: number }) {
  return (
    <path
      d={`M${String(x)} ${String(y - t)} Q ${String(x)} ${String(y)} ${String(x + t)} ${String(y)} Q ${String(x)} ${String(y)} ${String(x)} ${String(y + t)} Q ${String(x)} ${String(y)} ${String(x - t)} ${String(y)} Q ${String(x)} ${String(y)} ${String(x)} ${String(y - t)} Z`}
    />
  )
}

function Traitement() {
  return (
    <>
      {/* Tête de présentation et support */}
      <path d="M150 196 C 150 130, 250 130, 250 196 C 250 250, 228 272, 200 272 C 172 272, 150 250, 150 196 Z" />
      <path d="M182 270 L 178 330 M218 270 L 222 330" />
      <path d="M150 330 L 250 330 L 240 352 L 160 352 Z" />
      <path d="M200 352 L 200 440 M150 440 L 250 440" />
      {/* Perruque */}
      <path d="M140 196 C 128 112, 272 112, 260 196" strokeWidth={2.2} />
      <path d="M140 196 C 122 262, 142 322, 126 392" />
      <path d="M260 196 C 278 262, 258 322, 274 392" />
      <path d="M152 170 C 140 262, 158 322, 146 384" opacity={0.6} />
      <path d="M248 170 C 260 262, 242 322, 254 384" opacity={0.6} />
      <path d="M176 126 C 164 160, 160 180, 162 200" opacity={0.5} />
      <path d="M224 126 C 236 160, 240 180, 238 200" opacity={0.5} />
      {/* Soin : gouttes et éclats */}
      <Goutte x={330} y={132} r={13} />
      <Goutte x={306} y={186} r={8} />
      <Goutte x={346} y={214} r={6} />
      <Eclat x={88} y={150} t={12} />
      <Eclat x={112} y={196} t={6} />
      {/* Peigne à dents larges */}
      <g transform="rotate(-18 92 330)">
        <rect x={56} y={300} width={76} height={16} rx={6} />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M${String(64 + i * 9)} 316 L ${String(64 + i * 9)} 344`} />
        ))}
      </g>
    </>
  )
}

function Coloration({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-miel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d89f" />
          <stop offset="1" stopColor="#d6a756" />
        </linearGradient>
        <linearGradient id={`${id}-cuivre`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9a26a" />
          <stop offset="1" stopColor="#a8551f" />
        </linearGradient>
        <linearGradient id={`${id}-acajou`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a4a2a" />
          <stop offset="1" stopColor="#4a1f12" />
        </linearGradient>
      </defs>
      {/* Trois mèches, trois nuances */}
      <path
        d="M200 86 C 152 180, 124 282, 112 402 C 130 410, 150 408, 164 400 C 172 292, 186 190, 200 86 Z"
        fill={`url(#${id}-miel)`}
        fillOpacity={0.55}
      />
      <path
        d="M200 86 C 190 196, 188 304, 196 414 C 210 418, 224 416, 236 410 C 228 304, 214 196, 200 86 Z"
        fill={`url(#${id}-cuivre)`}
        fillOpacity={0.6}
      />
      <path
        d="M200 86 C 248 180, 276 282, 290 402 C 272 410, 254 408, 242 400 C 234 292, 216 190, 200 86 Z"
        fill={`url(#${id}-acajou)`}
        fillOpacity={0.55}
      />
      <path d="M140 300 C 136 330, 134 360, 134 400" opacity={0.5} />
      <path d="M214 300 C 216 340, 216 370, 216 412" opacity={0.5} />
      <path d="M262 300 C 266 330, 268 360, 268 402" opacity={0.5} />
      <ellipse cx={200} cy={88} rx={20} ry={8} strokeWidth={2.2} />
      {/* Bol et pinceau de coloration */}
      <path d="M48 418 C 48 466, 152 466, 152 418" />
      <ellipse cx={100} cy={418} rx={52} ry={11} />
      <path d="M70 420 q 30 8 60 0" opacity={0.6} />
      <g transform="rotate(28 334 352)">
        <rect x={322} y={330} width={24} height={118} rx={12} />
        <rect x={318} y={300} width={32} height={32} rx={4} />
        <path d="M318 300 L 322 276 L 346 276 L 350 300" />
        <path d="M326 276 L 326 300 M334 276 L 334 300 M342 276 L 342 300" opacity={0.6} />
      </g>
    </>
  )
}

function Montage() {
  return (
    <>
      {/* Bonnet de perruque (filet) */}
      <path d="M100 330 C 100 156, 300 156, 300 330 Z" strokeWidth={2.2} />
      <path d="M200 176 L 200 330" opacity={0.55} />
      <path d="M150 190 C 136 240, 132 290, 134 330" opacity={0.55} />
      <path d="M250 190 C 264 240, 268 290, 266 330" opacity={0.55} />
      <path d="M118 236 C 160 222, 240 222, 282 236" opacity={0.55} />
      <path d="M106 284 C 160 270, 240 270, 294 284" opacity={0.55} />
      {/* Trames cousues, mèches qui tombent */}
      {[250, 298].map((y) => (
        <g key={y}>
          <path
            d={`M${String(y === 250 ? 116 : 104)} ${String(y)} C 160 ${String(y - 10)}, 240 ${String(y - 10)}, ${String(y === 250 ? 284 : 296)} ${String(y)}`}
            strokeWidth={2.2}
          />
          {Array.from({ length: 9 }, (_, i) => {
            const x = 128 + i * 18
            return (
              <path
                key={x}
                d={`M${String(x)} ${String(y - 6)} C ${String(x - 6)} ${String(y + 40)}, ${String(x + 6)} ${String(y + 80)}, ${String(x - 2)} ${String(y + 130)}`}
                opacity={0.45}
              />
            )
          })}
        </g>
      ))}
      {/* Aiguille courbe et fil */}
      <path d="M296 128 C 330 108, 356 84, 368 52" strokeWidth={2.4} />
      <ellipse cx={366} cy={58} rx={3} ry={7} transform="rotate(28 366 58)" />
      <path d="M296 128 C 252 160, 330 196, 286 236" strokeDasharray="3 5" />
      {/* Bobine */}
      <rect x={52} y={92} width={44} height={14} rx={3} />
      <rect x={58} y={106} width={32} height={40} />
      <rect x={52} y={146} width={44} height={14} rx={3} />
      <path d="M58 116 L 90 116 M58 126 L 90 126 M58 136 L 90 136" opacity={0.6} />
    </>
  )
}

const DESSINS: Record<string, (id: string) => ReactNode> = {
  'pose-frontale': () => <PoseFrontale />,
  'traitement-de-perruque': () => <Traitement />,
  'coloration-de-perruque': (id) => <Coloration id={id} />,
  'montage-de-perruque': () => <Montage />,
}

export function IllustrationPrestation({
  slug,
  nuit,
  className,
}: {
  slug: string
  nuit: boolean
  className?: string
}) {
  const id = `illu-${useId().replace(/:/g, '')}`
  const dessin = DESSINS[slug] ?? DESSINS['pose-frontale']
  return (
    <svg
      aria-hidden="true"
      viewBox="20 30 360 460"
      className={className}
      fill="none"
      stroke={nuit ? 'var(--gd-or)' : 'var(--gd-or-profond)'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dessin?.(id)}
    </svg>
  )
}
