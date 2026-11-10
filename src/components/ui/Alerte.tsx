import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cx } from '@/lib/cx'

export type TonAlerte = 'info' | 'succes' | 'alerte' | 'danger'

const TONS: Record<TonAlerte, { cadre: string; icone: ReactNode }> = {
  info: { cadre: 'border-info/30 bg-info/8 [&_svg]:text-info', icone: <Info /> },
  succes: { cadre: 'border-succes/30 bg-succes/8 [&_svg]:text-succes', icone: <CircleCheck /> },
  alerte: { cadre: 'border-alerte/35 bg-alerte/8 [&_svg]:text-alerte', icone: <TriangleAlert /> },
  danger: { cadre: 'border-danger/35 bg-danger/8 [&_svg]:text-danger', icone: <CircleAlert /> },
}

/** Message dans la page (pas une notification éphémère). Icône + texte : jamais la couleur seule. */
export function Alerte({
  ton = 'info',
  titre,
  children,
  actions,
  className,
}: {
  ton?: TonAlerte
  titre: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      role={ton === 'danger' || ton === 'alerte' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-[12px] border px-4 py-3.5', TONS[ton].cadre, className)}
    >
      <span aria-hidden="true" className="mt-px [&_svg]:size-5">
        {TONS[ton].icone}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-encre">{titre}</p>
        {children && <div className="text-sm leading-relaxed text-encre-2">{children}</div>}
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
