import type { ReactNode } from 'react'
import { VeineOr } from '@/components/marque/VeineOr'
import { cx } from '@/lib/cx'

/** En-tête des pages publiques : titre didone, veine d'or, introduction, actions. */
export function EnTetePage({
  titre,
  intro,
  actions,
  className,
}: {
  titre: string
  intro?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cx('pt-12 pb-10 sm:pt-16', className)}>
      <h1 className="titre-affiche text-[44px] text-ivoire sm:text-[64px]">{titre}</h1>
      <VeineOr className="mt-5 max-w-xs" />
      {intro && (
        <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ivoire-2">{intro}</div>
      )}
      {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}
