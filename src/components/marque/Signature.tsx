import { cx } from '@/lib/cx'

/**
 * Nom de marque composé en didone, en attendant le logo officiel (à fournir par le client).
 * Remplacer ce composant par le logo dès réception, sans toucher aux gabarits.
 */
export function Signature({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'font-display text-[15px] font-medium tracking-[0.32em] whitespace-nowrap text-ivoire uppercase',
        className,
      )}
    >
      Glorious Destiny
    </span>
  )
}
