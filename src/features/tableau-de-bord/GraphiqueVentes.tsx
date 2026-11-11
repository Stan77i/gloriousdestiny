import { useState } from 'react'
import { formaterJour } from '@/lib/format/date'
import { formaterFcfa } from '@/lib/format/montant'
import { graduation } from './periodes'

type Point = { jour: string; ca_fcfa: number; nombre: number }

function compact(montant: number): string {
  if (montant >= 1_000_000) return `${String(Math.round(montant / 100_000) / 10)} M`
  if (montant >= 1000) return `${String(Math.round(montant / 1000))} k`
  return String(montant)
}

/**
 * Chiffre d'affaires par jour : une série, des barres fines dorées ancrées sur la ligne de base,
 * une infobulle au survol ou au clavier, et le tableau des valeurs pour qui ne lit pas le graphique.
 */
export function GraphiqueVentes({ serie }: { serie: Point[] }) {
  const [actif, setActif] = useState<number | null>(null)
  const haut = graduation(Math.max(...serie.map((p) => p.ca_fcfa)))
  const point = actif === null ? undefined : serie[actif]
  const reperes = serie.length > 7 ? [0, Math.floor(serie.length / 2), serie.length - 1] : null

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 text-[12px] text-encre-3">
          <span className="chiffres">{haut > 0 ? compact(haut) : ''}</span>
          <span className="h-px flex-1 border-t border-dashed border-filet" />
        </div>
        <div
          className="flex h-44 items-end gap-[2px] border-b border-filet pt-5"
          onMouseLeave={() => {
            setActif(null)
          }}
        >
          {serie.map((p, i) => {
            const hauteur = haut > 0 ? (p.ca_fcfa / haut) * 100 : 0
            return (
              <button
                key={p.jour}
                type="button"
                aria-label={`${formaterJour(p.jour)} : ${formaterFcfa(p.ca_fcfa)}, ${String(p.nombre)} vente(s)`}
                onMouseEnter={() => {
                  setActif(i)
                }}
                onFocus={() => {
                  setActif(i)
                }}
                onBlur={() => {
                  setActif(null)
                }}
                className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-t-[4px] focus-visible:outline-2 focus-visible:outline-or"
              >
                <span
                  className={
                    p.ca_fcfa > 0
                      ? 'w-full max-w-6 rounded-t-[4px] bg-or transition-opacity group-hover:opacity-80'
                      : 'w-full max-w-6'
                  }
                  style={{ height: p.ca_fcfa > 0 ? `max(${String(hauteur)}%, 3px)` : 0 }}
                />
              </button>
            )
          })}
        </div>
        {point && actif !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-bloc bg-encre px-3 py-2 text-[13px] whitespace-nowrap text-fond shadow-panneau"
            style={{
              left: `clamp(70px, ${String(((actif + 0.5) / serie.length) * 100)}%, calc(100% - 70px))`,
            }}
          >
            <p className="font-semibold">{formaterJour(point.jour, 'court')}</p>
            <p className="chiffres">{formaterFcfa(point.ca_fcfa)}</p>
            <p className="opacity-75">{point.nombre} vente(s)</p>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[12px] text-encre-3">
        {(reperes ?? serie.map((_, i) => i)).map((i) => {
          const p = serie[i]
          return p ? (
            <span key={p.jour} className={reperes ? '' : 'min-w-0 flex-1 text-center'}>
              {reperes
                ? formaterJour(p.jour, 'court')
                : formaterJour(p.jour, 'court').split(' ').slice(0, 2).join(' ')}
            </span>
          ) : null
        })}
      </div>
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-encre-2">
          Voir les valeurs en tableau
        </summary>
        <table className="mt-2 w-full text-left text-[13px]">
          <thead className="text-encre-3">
            <tr>
              <th className="py-1 font-medium">Jour</th>
              <th className="py-1 text-right font-medium">Ventes</th>
              <th className="py-1 text-right font-medium">CA net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filet">
            {serie.map((p) => (
              <tr key={p.jour}>
                <td className="py-1">{formaterJour(p.jour, 'court')}</td>
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
