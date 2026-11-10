import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type Colonne<T> = {
  id: string
  entete: string
  cellule: (ligne: T) => ReactNode
  /** Colonne numérique : alignée à droite, chiffres tabulaires. */
  numerique?: boolean
  /** Masquée sur petit écran (la vue carte reprend les colonnes essentielles). */
  secondaire?: boolean
}

/**
 * Tableau de données. Sur mobile, chaque ligne devient une fiche empilée
 * (libellé + valeur) : pas de défilement horizontal.
 */
export function Tableau<T>({
  colonnes,
  lignes,
  cle,
  legende,
  vide,
}: {
  colonnes: Colonne<T>[]
  lignes: T[]
  cle: (ligne: T) => string
  legende: string
  vide?: ReactNode
}) {
  if (lignes.length === 0 && vide) return <>{vide}</>

  return (
    <div className="overflow-hidden rounded-panneau border border-filet bg-surface-1">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{legende}</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-filet bg-surface-2/60">
            {colonnes.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cx(
                  'px-5 py-3 text-xs font-semibold tracking-[0.04em] text-ivoire-3 uppercase',
                  c.numerique ? 'text-right' : 'text-left',
                  c.secondaire && 'hidden lg:table-cell',
                )}
              >
                {c.entete}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-filet">
          {lignes.map((ligne) => (
            <tr
              key={cle(ligne)}
              className="relative grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2/50 sm:table-row sm:p-0"
            >
              {colonnes.map((c, i) => (
                <td
                  key={c.id}
                  className={cx(
                    'text-ivoire-2 sm:px-5 sm:py-3.5',
                    i === 0 && 'col-span-2 font-semibold text-ivoire sm:col-span-1',
                    c.numerique && 'chiffres sm:text-right',
                    c.secondaire && 'sm:hidden lg:table-cell',
                  )}
                >
                  {i > 0 && (
                    <span className="block text-[11px] tracking-[0.04em] text-ivoire-3 uppercase sm:hidden">
                      {c.entete}
                    </span>
                  )}
                  {c.cellule(ligne)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
