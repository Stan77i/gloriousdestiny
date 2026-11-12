import { cx } from '@/lib/cx'

/**
 * Logo provisoire : pastille d'encre frappée d'un « G » d'or, suivie du nom en Urbanist.
 * Remplacer ce composant par le logo officiel dès réception, sans toucher aux gabarits.
 */
export function Signature({
  className,
  nom = true,
  vivante = false,
}: {
  className?: string
  nom?: boolean
  /** En-tête : un anneau de lumière tourne autour du « G », un reflet d'or passe sur le nom. */
  vivante?: boolean
}) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 text-encre', className)}>
      <span
        aria-hidden="true"
        className="degrade-or grid size-10 shrink-0 place-items-center rounded-full text-sur-or shadow-or"
      >
        <span className="text-[16px] leading-none font-bold tracking-[-0.03em]">GD</span>
      </span>
      {nom && (
        <span
          className={cx(
            'text-[19px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap',
            vivante && 'logo-nom',
          )}
        >
          Glorious Destiny
        </span>
      )}
    </span>
  )
}
