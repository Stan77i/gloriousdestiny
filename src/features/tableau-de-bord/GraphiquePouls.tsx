import { formaterFcfa } from '@/lib/format/montant'
import { cx } from '@/lib/cx'
import { graduation, montantCompact } from './periodes'

export type PointPouls = { debut: string; ca_fcfa: number; nombre: number }

/**
 * Pouls des ventes : colonnes en pilule dans une piste hachurée (l'échelle), une étiquette
 * de valeur reliée d'un fil sur chaque sommet. La période en cours est en or ; les autres
 * en encre au-dessus de la moyenne, en gris en dessous.
 */
export function GraphiquePouls({
  points,
  etiquette,
  etiquetteLongue,
}: {
  points: PointPouls[]
  etiquette: (debut: string) => string
  etiquetteLongue: (debut: string) => string
}) {
  const haut = graduation(Math.max(0, ...points.map((p) => p.ca_fcfa)))
  const moyenne = points.reduce((s, p) => s + p.ca_fcfa, 0) / Math.max(points.length, 1)
  const ratio = (p: PointPouls) => (haut > 0 ? p.ca_fcfa / haut : 0)
  const n = points.length
  // Sommets en coordonnées 0–100 (x au centre de chaque colonne, y depuis le haut).
  const sommets = points.map(
    (p, i) => `${String(((i + 0.5) / n) * 100)},${String(100 - ratio(p) * 100)}`,
  )

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative h-64 pt-4">
        <div className="relative flex h-full items-end gap-2 sm:gap-4">
          {points.map((p, i) => {
            const enCours = i === n - 1
            const h = ratio(p) * 100
            return (
              <div
                key={p.debut}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center"
              >
                <span className="hachures absolute inset-x-0 top-0 bottom-0 mx-auto w-full max-w-16 rounded-full opacity-70" />
                {p.ca_fcfa > 0 && (
                  <span
                    className={cx(
                      'relative w-full max-w-16 rounded-full',
                      enCours
                        ? 'degrade-or shadow-or'
                        : p.ca_fcfa >= moyenne
                          ? 'bg-encre'
                          : 'bg-[color-mix(in_oklab,var(--color-encre)_32%,var(--color-carte-3))]',
                    )}
                    style={{ height: `max(${String(h)}%, 18px)` }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Fil reliant les sommets, sous les étiquettes */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-4 bottom-0 h-[calc(100%-1rem)] w-full overflow-visible"
        >
          <polyline
            points={sommets.join(' ')}
            fill="none"
            stroke="var(--color-encre-3)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-4 bottom-0">
          {points.map((p, i) => {
            const enCours = i === n - 1
            return (
              <span
                key={p.debut}
                className={cx(
                  'chiffres absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-panneau',
                  enCours ? 'bg-encre text-fond' : 'bg-carte text-encre',
                )}
                style={{
                  left: `${String(((i + 0.5) / n) * 100)}%`,
                  top: `${String(100 - ratio(p) * 100)}%`,
                }}
              >
                {montantCompact(p.ca_fcfa)}
              </span>
            )
          })}
        </div>
      </div>
      <div className="flex gap-2 sm:gap-4">
        {points.map((p, i) => (
          <span
            key={p.debut}
            className={cx(
              'min-w-0 flex-1 truncate text-center text-[12px]',
              i === n - 1 ? 'font-semibold text-or-texte' : 'text-encre-3',
            )}
          >
            {etiquette(p.debut)}
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-encre-2">
          Voir les valeurs en tableau
        </summary>
        <table className="mt-2 w-full text-left text-[13px]">
          <thead className="text-encre-3">
            <tr>
              <th className="py-1 font-medium">Période</th>
              <th className="py-1 text-right font-medium">Ventes</th>
              <th className="py-1 text-right font-medium">CA net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filet">
            {points.map((p) => (
              <tr key={p.debut}>
                <td className="py-1">{etiquetteLongue(p.debut)}</td>
                <td className="chiffres py-1 text-right">{p.nombre}</td>
                <td className="chiffres py-1 text-right">{formaterFcfa(p.ca_fcfa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
