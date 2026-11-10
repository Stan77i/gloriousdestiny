import { useState } from 'react'
import { cx } from '@/lib/cx'
import { graduations } from './echelle'

export type PointColonne = { libelle: string; valeur: number; libelleLong?: string }

/**
 * Histogramme à une série (ex. chiffre d'affaires par mois).
 * Colonnes fines (≤ 24 px, bout arrondi 4 px, base carrée), période mise en avant en or,
 * info-bulle au survol et au clavier, tableau équivalent pour les lecteurs d'écran.
 */
export function GraphiqueColonnes({
  points,
  titre,
  formater,
  formaterAxe = formater,
  enAvant,
  hauteur = 220,
}: {
  points: PointColonne[]
  titre: string
  formater: (valeur: number) => string
  formaterAxe?: (valeur: number) => string
  /** Index de la colonne mise en avant (période en cours). */
  enAvant?: number
  hauteur?: number
}) {
  const [survol, setSurvol] = useState<number | null>(null)
  const ticks = graduations(Math.max(...points.map((p) => p.valeur), 0))
  const haut = ticks.at(-1) ?? 1

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex gap-3" style={{ height: hauteur }}>
        {/* Axe des valeurs */}
        <div
          aria-hidden="true"
          className="chiffres relative w-14 shrink-0 text-right text-[11px] text-encre-3"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0"
              style={{ bottom: `${(t / haut) * 100}%`, transform: 'translateY(50%)' }}
            >
              {formaterAxe(t)}
            </span>
          ))}
        </div>
        {/* Zone de tracé */}
        <div className="relative flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden="true"
              className={cx('absolute inset-x-0 h-px', t === 0 ? 'bg-filet-fort' : 'bg-filet')}
              style={{ bottom: `${(t / haut) * 100}%` }}
            />
          ))}
          <ul className="absolute inset-0 flex items-end" aria-hidden="true">
            {points.map((p, i) => {
              const actif = survol === i
              const mis = enAvant === i
              return (
                <li
                  key={p.libelle}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onPointerEnter={() => {
                    setSurvol(i)
                  }}
                  onPointerLeave={() => {
                    setSurvol(null)
                  }}
                >
                  <span
                    className={cx(
                      'block w-[min(24px,60%)] rounded-t-[4px] transition-[background-color,height] duration-500 ease-(--ease-sortie)',
                      mis ? 'bg-or' : actif ? 'bg-or/70' : 'bg-or/38',
                    )}
                    style={{ height: `${(p.valeur / haut) * 100}%` }}
                  />
                  {actif && (
                    <span
                      className="pointer-events-none absolute bottom-[calc(var(--h)+10px)] z-10 rounded-[8px] border border-filet-fort bg-carte-3 px-2.5 py-1.5 text-xs whitespace-nowrap text-encre shadow-flottant"
                      style={{ ['--h' as string]: `${(p.valeur / haut) * hauteur}px` }}
                    >
                      <span className="block text-encre-3">{p.libelleLong ?? p.libelle}</span>
                      <span className="chiffres font-semibold">{formater(p.valeur)}</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {/* Axe des périodes */}
      <div aria-hidden="true" className="ml-17 flex">
        {points.map((p, i) => (
          <span
            key={p.libelle}
            className={cx(
              'flex-1 text-center text-[11px]',
              enAvant === i ? 'font-semibold text-or-texte' : 'text-encre-3',
              // Écran étroit : une étiquette sur deux, comptée depuis la période mise en avant (toujours visible).
              Math.abs(i - (enAvant ?? points.length - 1)) % 2 === 1 && 'max-sm:invisible',
            )}
          >
            {p.libelle}
          </span>
        ))}
      </div>
      {/* Équivalent accessible */}
      <table className="sr-only">
        <caption>{titre}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.libelle}>
              <th scope="row">{p.libelleLong ?? p.libelle}</th>
              <td>{formater(p.valeur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
