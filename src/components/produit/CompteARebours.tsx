import { useEffect, useRef } from 'react'
import { useHorloge } from '@/hooks/useHorloge'
import { restant } from '@/lib/format/echeance'
import { cx } from '@/lib/cx'

const deux = (n: number) => String(n).padStart(2, '0')

/**
 * Compte à rebours d'une offre réelle (sa vraie date de fin). Ne repart jamais : à zéro, il
 * affiche « Offre terminée » et prévient (pour relire les prix, la promotion disparaît).
 * Chaque chiffre qui change glisse doucement ; mouvement réduit : changement direct.
 */
export function CompteARebours({
  fin,
  titre = 'Offre spéciale — fin dans',
  onTermine,
  compact = false,
  className,
}: {
  fin: string
  titre?: string
  onTermine?: () => void
  compact?: boolean
  className?: string
}) {
  const maintenant = useHorloge()
  const r = restant(fin, maintenant)
  const prevenu = useRef(false)
  useEffect(() => {
    if (r.total === 0 && !prevenu.current) {
      prevenu.current = true
      onTermine?.()
    }
  }, [r.total, onTermine])

  if (r.total === 0) {
    return (
      <p className={cx('text-[15px] font-semibold text-encre-2', className)} role="status">
        Offre terminée
      </p>
    )
  }
  const unites: [number, string, string][] = [
    [r.jours, 'jours', 'j'],
    [r.heures, 'heures', 'h'],
    [r.minutes, 'minutes', 'min'],
    [r.secondes, 'secondes', 's'],
  ]
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {!compact && (
        <p className="text-[12px] font-semibold tracking-[0.14em] text-or uppercase">{titre}</p>
      )}
      <p className="sr-only">
        {`${titre} ${String(r.jours)} jours, ${String(r.heures)} heures, ${String(r.minutes)} minutes`}
      </p>
      <ol aria-hidden="true" className="chiffres flex items-center gap-1.5 sm:gap-2">
        {unites.map(([n, long, court], i) => (
          <li key={long} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cx(
                'flex flex-col items-center rounded-[14px] bg-carte ring-1 ring-or/25',
                compact ? 'min-w-11 px-2 py-1' : 'min-w-[58px] px-2.5 py-2 sm:min-w-[68px]',
              )}
            >
              <span className="relative block overflow-hidden">
                <span
                  key={n}
                  className={cx(
                    'chiffre-glisse block font-semibold text-encre',
                    compact ? 'text-[17px]' : 'text-[26px] leading-none sm:text-[32px]',
                  )}
                >
                  {deux(n)}
                </span>
              </span>
              <span className="mt-0.5 text-[10px] tracking-[0.12em] text-encre-3 uppercase">
                {compact ? court : long}
              </span>
            </span>
            {i < 3 && <span className="text-or">:</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}
