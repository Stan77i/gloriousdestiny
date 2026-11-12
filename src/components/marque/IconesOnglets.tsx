import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Icônes de la barre d'onglets, dessinées pour Glorious Destiny (trait 1,6, coins arrondis,
 * grille 24 px), à la manière des applications beauté : un trait fin au repos, une forme
 * remplie d'or doux quand l'onglet est actif. Décoratives : le libellé est écrit dessous.
 */
function Icone({ actif, children }: { actif: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx(
        'size-6 transition-transform duration-300 ease-(--ease-sortie)',
        actif && 'onglet-actif-icone',
      )}
    >
      {children}
    </svg>
  )
}

const REMPLI = 'var(--gd-or-doux)'

/** Accueil : l'arche d'entrée du salon. */
export function IconeAccueil({ actif }: { actif: boolean }) {
  return (
    <Icone actif={actif}>
      <path d="M5 21V10.5a7 7 0 0 1 14 0V21" fill={actif ? REMPLI : 'none'} />
      <path d="M3 21h18" />
      <path d="M10 21v-4.5a2 2 0 0 1 4 0V21" />
    </Icone>
  )
}

/** Boutique : un flacon à pompe, la gamme. */
export function IconeBoutique({ actif }: { actif: boolean }) {
  return (
    <Icone actif={actif}>
      <path
        d="M7 10.5h10v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5Z"
        fill={actif ? REMPLI : 'none'}
      />
      <path d="M10 10.5V7h4v3.5" />
      <path d="M12 7V3.5h3.5" />
      <path d="M10 15h4" />
    </Icone>
  )
}

/** Prestations : le miroir du salon et son éclat. */
export function IconePrestations({ actif }: { actif: boolean }) {
  return (
    <Icone actif={actif}>
      <circle cx={12} cy={9} r={6} fill={actif ? REMPLI : 'none'} />
      <path d="M12 15v6M9.5 21h5" />
      <path d="M12 6.2c.2 1.4.7 1.9 2.1 2.1-1.4.2-1.9.7-2.1 2.1-.2-1.4-.7-1.9-2.1-2.1 1.4-.2 1.9-.7 2.1-2.1Z" />
    </Icone>
  )
}

/** Panier : le sac de la boutique. */
export function IconePanier({ actif }: { actif: boolean }) {
  return (
    <Icone actif={actif}>
      <path
        d="M5 8h14l-1.1 11.6a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4Z"
        fill={actif ? REMPLI : 'none'}
      />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </Icone>
  )
}

/** Plus : le reste du site (menu). */
export function IconePlus({ actif }: { actif: boolean }) {
  return (
    <Icone actif={actif}>
      <rect x={4} y={4} width={7} height={7} rx={2} fill={actif ? REMPLI : 'none'} />
      <rect x={13} y={4} width={7} height={7} rx={2} />
      <rect x={4} y={13} width={7} height={7} rx={2} />
      <rect x={13} y={13} width={7} height={7} rx={3.5} />
    </Icone>
  )
}
