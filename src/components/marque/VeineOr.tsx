import { cx } from '@/lib/cx'

/**
 * Signature de la marque : la veine d'or du marbre des étiquettes Glorious Destiny.
 * Un filet organique tracé à la main, qui se dessine à l'apparition (CSS pur,
 * sans bibliothèque : le site public reste léger). Mouvement réduit : déjà tracée.
 */
export function VeineOr({ className, animee = true }: { className?: string; animee?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 40"
      preserveAspectRatio="none"
      className={cx('h-5 w-full overflow-visible text-or', className)}
    >
      <path
        d="M0 24 C 70 22, 110 30, 168 23 S 262 9, 318 17 S 396 33, 452 25 C 498 19, 530 11, 571 15 S 622 22, 640 18"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={cx(animee && 'veine-trace')}
      />
      {/* Ramification fine, plus discrète */}
      <path
        d="M318 17 C 340 12, 352 4, 378 3"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="0.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={cx(animee && 'veine-trace veine-trace-retard')}
      />
    </svg>
  )
}
