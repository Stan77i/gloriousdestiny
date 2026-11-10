import { cx } from '@/lib/cx'

type Props = { taille?: 'petit' | 'normal'; libelle?: string; className?: string }

/** Indicateur de chargement : un arc d'or qui tourne. Annoncé aux lecteurs d'écran. */
export function Chargeur({ taille = 'normal', libelle = 'Chargement', className }: Props) {
  return (
    <span role="status" className={cx('inline-flex items-center', className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cx('animate-spin', taille === 'petit' ? 'size-4' : 'size-7')}
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{libelle}</span>
    </span>
  )
}

/** Bloc fantôme pendant le chargement d'un contenu (forme du contenu à venir). */
export function Squelette({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('block animate-pulse-doux rounded-md bg-surface-3', className)}
    />
  )
}
