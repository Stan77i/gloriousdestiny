type Props = { taille?: 'petit' | 'normal'; libelle?: string }

/** Indicateur de chargement accessible. */
export function Chargeur({ taille = 'normal', libelle = 'Chargement' }: Props) {
  const dimension = taille === 'petit' ? 'size-4' : 'size-8'
  return (
    <span role="status" className="inline-flex items-center">
      <span
        aria-hidden="true"
        className={`${dimension} animate-spin rounded-full border-2 border-current border-t-transparent`}
      />
      <span className="sr-only">{libelle}</span>
    </span>
  )
}
