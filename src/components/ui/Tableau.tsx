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
  /** Sur mobile, occupe toute la largeur de la fiche (ex. rangée d'actions). */
  pleineLargeur?: boolean
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
    <div className="overflow-hidden rounded-panneau bg-carte shadow-panneau">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{legende}</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-filet">
            {colonnes.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cx(
                  'px-5 py-3.5 text-[13px] font-medium text-encre-3',
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
              className="relative grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-carte-2 sm:table-row sm:p-0"
            >
              {colonnes.map((c, i) => (
                <td
                  key={c.id}
                  className={cx(
                    'text-encre-2 sm:px-5 sm:py-3.5',
                    i === 0 && 'col-span-2 font-semibold text-encre sm:col-span-1',
                    c.numerique && 'chiffres sm:text-right',
                    c.secondaire && 'sm:hidden lg:table-cell',
                    c.pleineLargeur && 'col-span-2 sm:col-span-1',
                  )}
                >
                  {i > 0 && (
                    <span className="block text-[13px] font-medium text-encre-3 sm:hidden">
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
