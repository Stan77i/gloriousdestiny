import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type TonBadge = 'neutre' | 'or' | 'succes' | 'alerte' | 'danger' | 'info'

const TONS: Record<TonBadge, { fond: string; point: string }> = {
  neutre: { fond: 'bg-carte-3 text-encre-2', point: 'bg-encre-3' },
  or: { fond: 'bg-or/14 text-or-texte', point: 'bg-or' },
  succes: { fond: 'bg-succes/12 text-succes', point: 'bg-succes' },
  alerte: { fond: 'bg-alerte/12 text-alerte', point: 'bg-alerte' },
  danger: { fond: 'bg-danger/12 text-danger', point: 'bg-danger' },
  info: { fond: 'bg-info/12 text-info', point: 'bg-info' },
}

/** Étiquette d'état. Le point coloré double le texte : l'état ne repose jamais sur la couleur seule. */
export function Badge({
  ton = 'neutre',
  point = true,
  children,
  className,
}: {
  ton?: TonBadge
  point?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        TONS[ton].fond,
        className,
      )}
    >
      {point && (
        <span aria-hidden="true" className={cx('size-1.5 rounded-full', TONS[ton].point)} />
      )}
      {children}
    </span>
  )
}

/** Pastille de compteur (navigation, onglets). */
export function Compteur({ valeur, actif = false }: { valeur: number; actif?: boolean }) {
  return (
    <span
      className={cx(
        'chiffres inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
        actif ? 'bg-sur-or/15 text-sur-or' : 'bg-carte-3 text-encre-2',
      )}
    >
      {valeur}
    </span>
  )
}
