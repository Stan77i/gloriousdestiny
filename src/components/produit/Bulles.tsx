import { cx } from '@/lib/cx'

/** Bulles fixes (positions, tailles et rythmes choisis à la main : pas de hasard au rendu). */
const BULLES = [
  { g: 18, t: 9, d: 3.4, r: 0, x: 6 },
  { g: 30, t: 14, d: 4.1, r: 0.6, x: -8 },
  { g: 44, t: 8, d: 3.1, r: 1.3, x: 5 },
  { g: 58, t: 12, d: 3.8, r: 0.3, x: -6 },
  { g: 70, t: 7, d: 2.9, r: 1.8, x: 7 },
  { g: 80, t: 16, d: 4.4, r: 0.9, x: -5 },
  { g: 36, t: 6, d: 2.7, r: 2.2, x: 4 },
  { g: 63, t: 10, d: 3.5, r: 2.6, x: -7 },
]

/**
 * Mousse légère : petites bulles translucides qui montent puis s'évanouissent. Réservées aux
 * produits de coiffage qui moussent ou gélifient (Hair Curl Mousse, Braid Gel). Au survol sur
 * ordinateur ; une ou deux fois à l'apparition sur téléphone ; jamais en mouvement réduit.
 */
export function Bulles({ auto = false, className }: { auto?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('pointer-events-none absolute inset-0 z-[5]', auto && 'bulles-auto', className)}
    >
      {BULLES.map((b) => (
        <span
          key={b.g}
          className="bulle"
          style={{
            left: `${String(b.g)}%`,
            width: b.t,
            height: b.t,
            ['--d' as string]: `${String(b.d)}s`,
            ['--r' as string]: `${String(b.r)}s`,
            ['--x' as string]: `${String(b.x)}px`,
          }}
        />
      ))}
    </span>
  )
}
