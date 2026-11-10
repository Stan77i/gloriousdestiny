import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { FOND_TEINTE, type Teinte } from '@/domain/univers'
import { cx } from '@/lib/cx'

/** Panneau : la surface de base de l'administration (titre, sous-titre, action, contenu). */
export function Panneau({
  titre,
  sousTitre,
  action,
  children,
  className,
  corpsClassName,
}: {
  titre?: string | undefined
  sousTitre?: string | undefined
  action?: ReactNode
  children: ReactNode
  className?: string
  corpsClassName?: string
}) {
  return (
    <section className={cx('rounded-panneau bg-carte shadow-panneau', className)}>
      {(titre ?? action) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            {titre && <h3 className="text-[17px] font-semibold text-encre">{titre}</h3>}
            {sousTitre && <p className="mt-0.5 text-[13px] text-encre-3">{sousTitre}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cx('p-5 sm:p-6', titre && 'pt-4 sm:pt-4', corpsClassName)}>{children}</div>
    </section>
  )
}

/** Fond d'une tuile : carte neutre, or (à traiter), menthe (fait, disponible) ou teinte d'univers. */
export type FondTuile = 'carte' | 'or' | 'menthe' | Teinte
const FONDS_TUILE: Record<FondTuile, string> = {
  carte: 'bg-carte',
  or: 'bg-or text-sur-or',
  menthe: 'bg-menthe text-sur-menthe',
  ...FOND_TEINTE,
}

type Variation = { valeur: string; sens: 'hausse' | 'baisse'; favorable: boolean; periode: string }

/**
 * Tuile de chiffre clé : libellé, valeur, variation signée par rapport à une période nommée.
 * La couleur de la variation dit si c'est favorable, la flèche dit le sens.
 */
export function TuileChiffre({
  libelle,
  valeur,
  complement,
  variation,
  icone,
  fond = 'carte',
}: {
  fond?: FondTuile
  libelle: string
  valeur: string
  complement?: string
  variation?: Variation
  icone?: ReactNode
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-3 rounded-panneau p-5 shadow-panneau',
        FONDS_TUILE[fond],
        fond === 'carte'
          ? '[&_.tuile-doux]:text-encre-3 [&_.tuile-texte]:text-encre-2'
          : '[&_.tuile-doux]:opacity-80',
      )}
    >
      <p className="tuile-texte flex items-center gap-2 text-[13px] font-medium [&_svg]:size-4">
        {icone}
        {libelle}
      </p>
      <p className="text-[44px] leading-none font-semibold tracking-[-0.035em]">{valeur}</p>
      {(variation ?? complement) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {variation && (
            <span
              className={cx(
                'chiffres inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold [&_svg]:size-3.5',
                variation.favorable ? 'bg-succes/12 text-succes' : 'bg-danger/12 text-danger',
              )}
            >
              {variation.sens === 'hausse' ? <ArrowUpRight /> : <ArrowDownRight />}
              {variation.valeur}
              <span className="sr-only">
                {variation.sens === 'hausse' ? 'en hausse' : 'en baisse'} {variation.periode}
              </span>
            </span>
          )}
          {variation && (
            <span aria-hidden="true" className="tuile-doux">
              {variation.periode}
            </span>
          )}
          {complement && <span className="tuile-doux">{complement}</span>}
        </div>
      )}
    </div>
  )
}
