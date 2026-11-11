import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '@/lib/cx'

export type Segment = { valeur: number; ton: 'fait' | 'cours' | 'attente'; libelle: string }

export type LigneEtat = {
  cle: string
  libelle: string
  icone: ReactNode
  total: number
  detail: string
  segments: Segment[]
  vers: string
}

const TON: Record<Segment['ton'], string> = {
  fait: 'bg-encre text-fond',
  cours: 'degrade-or-doux text-sur-or',
  attente: 'bg-carte-3 text-encre-2',
}

/** Légende partagée par toutes les lignes (couleur + mot, jamais la couleur seule). */
export function LegendeEtat({ libelles }: { libelles: Record<Segment['ton'], string> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-encre-2">
      {(['fait', 'cours', 'attente'] as const).map((t) => (
        <li key={t} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cx('size-2.5 rounded-[3px]', TON[t])} />
          {libelles[t]}
        </li>
      ))}
    </ul>
  )
}

/**
 * « Où en est la boutique » : pour chaque domaine, une barre en pilules proportionnelle
 * (fait en encre, en cours en or, en attente en gris), le nombre écrit dans chaque pilule.
 */
export function BarresEtat({ lignes }: { lignes: LigneEtat[] }) {
  return (
    <ul className="divide-y divide-filet">
      {lignes.map((l) => {
        const visibles = l.segments.filter((s) => s.valeur > 0)
        return (
          <li
            key={l.cle}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-4 md:grid-cols-[160px_80px_minmax(0,1fr)]"
          >
            <span className="flex items-center gap-3 font-medium">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-carte-2 text-encre-2 shadow-[inset_0_0_0_1px_var(--color-filet)] [&_svg]:size-4"
              >
                {l.icone}
              </span>
              {l.libelle}
            </span>
            <span className="text-right leading-tight md:text-left">
              <span className="chiffres block text-[22px] font-semibold tracking-[-0.02em]">
                {l.total}
              </span>
              <span className="text-[12px] text-encre-3">{l.detail}</span>
            </span>
            <div className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
              <div
                className="flex h-11 min-w-0 flex-1 gap-1.5"
                role="img"
                aria-label={`${l.libelle} : ${visibles.map((s) => `${String(s.valeur)} ${s.libelle}`).join(', ') || 'aucun'}`}
              >
                {visibles.length === 0 ? (
                  <span className="hachures flex-1 rounded-full" />
                ) : (
                  visibles.map((s) => (
                    <span
                      key={s.ton}
                      title={`${String(s.valeur)} ${s.libelle}`}
                      style={{ flexGrow: s.valeur, flexBasis: 0 }}
                      className={cx(
                        'chiffres flex min-w-11 items-center justify-end rounded-full px-3.5 text-[13px] font-semibold',
                        TON[s.ton],
                      )}
                    >
                      {s.valeur}
                    </span>
                  ))
                )}
              </div>
              <Link
                to={l.vers}
                aria-label={`Ouvrir ${l.libelle}`}
                className="grid size-10 shrink-0 place-items-center rounded-full text-encre-2 shadow-[inset_0_0_0_1px_var(--color-filet-fort)] hover:bg-carte-2 hover:text-encre [&_svg]:size-4"
              >
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
