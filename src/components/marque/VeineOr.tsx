import { useMouvementReduit } from '@/hooks/useMouvementReduit'
import { cx } from '@/lib/cx'

const TRACE =
  'M0 24 C 70 22, 110 30, 168 23 S 262 9, 318 17 S 396 33, 452 25 C 498 19, 530 11, 571 15 S 622 22, 640 18'
// Même tracé, ondulation décalée : le fil « respire » comme un cheveu porté par l'air.
const ONDULE =
  'M0 20 C 70 28, 110 22, 168 27 S 262 15, 318 13 S 396 27, 452 29 C 498 23, 530 15, 571 11 S 622 18, 640 22'

/**
 * Signature de la marque : la veine d'or du marbre des étiquettes, comme un fil de cheveu.
 * Elle se dessine à l'apparition ; `vivante` : ensuite elle ondule doucement et une lueur
 * dorée la parcourt de temps en temps. Mouvement réduit : déjà tracée, immobile.
 */
export function VeineOr({
  className,
  animee = true,
  vivante = false,
}: {
  className?: string
  animee?: boolean
  vivante?: boolean
}) {
  const reduit = useMouvementReduit()
  const bouge = vivante && !reduit
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 40"
      preserveAspectRatio="none"
      className={cx('h-5 w-full overflow-visible text-or', className)}
    >
      <path
        d={TRACE}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={cx(animee && 'veine-trace')}
      >
        {bouge && (
          <animate
            attributeName="d"
            values={`${TRACE};${ONDULE};${TRACE}`}
            dur="7s"
            begin="1.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
          />
        )}
      </path>
      {bouge && (
        <path
          d={TRACE}
          pathLength={1}
          fill="none"
          stroke="var(--gd-or-clair)"
          strokeWidth="2.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="veine-lueur"
        >
          <animate
            attributeName="d"
            values={`${TRACE};${ONDULE};${TRACE}`}
            dur="7s"
            begin="1.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
          />
        </path>
      )}
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
