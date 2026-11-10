import type { ReactNode } from 'react'
import { VeineOr } from '@/components/marque/VeineOr'
import { FOND_TEINTE, type Teinte } from '@/domain/univers'
import { cx } from '@/lib/cx'

/**
 * En-tête des pages publiques : grand titre, veine d'or, introduction, actions.
 * Avec `teinte`, l'en-tête devient une carte à la couleur de l'univers (perruques, cils…).
 */
export function EnTetePage({
  titre,
  intro,
  actions,
  teinte,
  className,
}: {
  titre: string
  intro?: ReactNode
  actions?: ReactNode
  teinte?: Teinte
  className?: string
}) {
  return (
    <header className={cx('pt-8 pb-10 sm:pt-12', className)}>
      <div
        className={
          teinte
            ? cx('rounded-panneau px-6 py-10 sm:px-12 sm:py-14', FOND_TEINTE[teinte])
            : undefined
        }
      >
        <h1 className="titre-affiche text-[44px] text-encre sm:text-[64px]">{titre}</h1>
        <VeineOr className="mt-5 max-w-xs" />
        {intro && (
          <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-encre-2">{intro}</div>
        )}
        {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  )
}
