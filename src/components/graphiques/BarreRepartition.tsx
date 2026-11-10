import { cx } from '@/lib/cx'
import { COULEURS_SERIES } from './series'

export type PartRepartition = { libelle: string; valeur: number }

/**
 * Barre segmentée haute : un tout découpé en parts (ex. ventes par ville).
 * Part affichée dans le bloc quand elle tient, légende sous la barre, résumé accessible.
 */
export function BarreRepartition({
  parts,
  titre,
  formater,
}: {
  parts: PartRepartition[]
  titre: string
  formater: (valeur: number) => string
}) {
  const total = parts.reduce((s, p) => s + p.valeur, 0)
  const visibles = parts.slice(0, COULEURS_SERIES.length)
  const pourcent = (v: number) => (total === 0 ? 0 : Math.round((v / total) * 100))
  const resume = visibles
    .map((p) => `${p.libelle} ${formater(p.valeur)} (${pourcent(p.valeur)} %)`)
    .join(', ')

  return (
    <figure className="flex flex-col gap-3">
      <div role="img" aria-label={`${titre} : ${resume}`} className="flex h-7 gap-0.5">
        {visibles.map((p, i) =>
          p.valeur > 0 ? (
            <span
              key={p.libelle}
              title={`${p.libelle} · ${formater(p.valeur)} · ${pourcent(p.valeur)} %`}
              className={cx(
                'flex items-center overflow-hidden rounded-[4px] px-2 text-xs font-semibold text-fond',
                COULEURS_SERIES[i],
              )}
              style={{ flexGrow: p.valeur, flexBasis: 0 }}
            >
              {pourcent(p.valeur) >= 12 && <span className="chiffres">{pourcent(p.valeur)} %</span>}
            </span>
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-encre-2" aria-hidden="true">
        {visibles.map((p, i) => (
          <li key={p.libelle} className="inline-flex items-center gap-2">
            <span className={cx('size-2.5 rounded-[3px]', COULEURS_SERIES[i])} />
            {p.libelle}
          </li>
        ))}
      </ul>
    </figure>
  )
}
