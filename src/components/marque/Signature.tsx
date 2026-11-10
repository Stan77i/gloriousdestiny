import { cx } from '@/lib/cx'

/**
 * Logo provisoire : pastille d'encre frappée d'un « G » d'or, suivie du nom en Urbanist.
 * Remplacer ce composant par le logo officiel dès réception, sans toucher aux gabarits.
 */
export function Signature({ className, nom = true }: { className?: string; nom?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 text-encre', className)}>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-encre text-or"
      >
        <svg viewBox="0 0 24 24" className="size-5">
          <path
            d="M17.6 7.2A7 7 0 1 0 19 13h-6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {nom && (
        <span className="text-[19px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap">
          Glorious Destiny
        </span>
      )}
    </span>
  )
}
