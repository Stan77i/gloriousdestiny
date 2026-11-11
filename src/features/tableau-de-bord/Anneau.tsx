import { cx } from '@/lib/cx'

export type PartAnneau = {
  cle: string
  libelle: string
  valeur: number
  couleur: string
  pastille: string
}

/**
 * Anneau de répartition : segments épais aux bouts arrondis, séparés d'un petit vide,
 * pourcentage au centre. La légende (pilules) donne chaque valeur en toutes lettres.
 */
export function Anneau({
  parts,
  centre,
  sousCentre,
  libelle,
}: {
  parts: PartAnneau[]
  centre: string
  sousCentre: string
  libelle: string
}) {
  const total = parts.reduce((s, p) => s + p.valeur, 0)
  const r = 42
  const c = 2 * Math.PI * r
  const ecart = total > 0 && parts.filter((p) => p.valeur > 0).length > 1 ? 16 : 0
  const visibles = parts.filter((p) => p.valeur > 0)
  const segments = visibles.map((p, i) => {
    const avant = visibles.slice(0, i).reduce((s, x) => s + x.valeur, 0)
    const longueur = total > 0 ? (p.valeur / total) * c : 0
    // Bouts arrondis : chaque bout déborde de 5,5 ; l’écart de 16 laisse un vide visible de 5.
    return {
      p,
      debut: total > 0 ? (avant / total) * c : 0,
      trait: Math.max(longueur - ecart, 0.01),
    }
  })

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="relative mx-auto size-[150px]">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={libelle}>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--color-carte-3)"
            strokeWidth="11"
          />
          {segments.map(({ p, debut, trait }) => (
            <circle
              key={p.cle}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={p.couleur}
              strokeWidth="11"
              strokeLinecap={ecart > 0 ? 'round' : 'butt'}
              strokeDasharray={`${String(trait)} ${String(c - trait)}`}
              strokeDashoffset={-debut - ecart / 2}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="chiffres text-[28px] leading-none font-semibold tracking-[-0.03em]">
            {centre}
          </span>
          <span className="mt-1 text-[12px] text-encre-3">{sousCentre}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {parts.map((p) => (
          <li
            key={p.cle}
            className="flex items-center gap-2.5 rounded-full bg-carte-2 px-4 py-2 text-[13px]"
          >
            <span
              aria-hidden="true"
              className={cx('size-2.5 shrink-0 rounded-[3px]', p.pastille)}
            />
            <span className="min-w-0 flex-1 truncate text-encre-2">{p.libelle}</span>
            <span className="chiffres font-semibold">{p.valeur}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
