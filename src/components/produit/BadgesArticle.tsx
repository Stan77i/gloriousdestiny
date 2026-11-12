import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Badges collés à l'image d'un article. Tous vrais : aucun n'est simulé.
 * - meilleure-vente : calculé sur les ventes réelles (serveur) ;
 * - stock-limite : stock réel sous le seuil d'alerte ;
 * - coup-de-coeur : sélection de l'équipe ;
 * - nouveau : jusqu'à la date fixée par l'équipe.
 */
import type { TypeBadge } from './badges'

function Couronne() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M2 12.5h12l1-7-3.6 2.6L8 2.5 4.6 8.1 1 5.5l1 7Zm0 1h12v1.2H2z" />
    </svg>
  )
}

function Coeur() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M8 14.2 6.9 13.2C3 9.7.5 7.5.5 4.8.5 2.6 2.2.9 4.4.9c1.2 0 2.4.6 3.1 1.5h1c.7-.9 1.9-1.5 3.1-1.5 2.2 0 3.9 1.7 3.9 3.9 0 2.7-2.5 4.9-6.4 8.4L8 14.2Z" />
    </svg>
  )
}

function Eclat() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M8 .8c.4 3.6 1.6 4.8 5.2 5.2v.1C9.6 6.5 8.4 7.7 8 11.3h-.1C7.5 7.7 6.3 6.5 2.7 6.1V6C6.3 5.6 7.5 4.4 7.9.8H8Zm4.6 9.4c.2 1.8.8 2.4 2.6 2.6-1.8.2-2.4.8-2.6 2.6-.2-1.8-.8-2.4-2.6-2.6 1.8-.2 2.4-.8 2.6-2.6Z" />
    </svg>
  )
}

function Flamme() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M8.6 1c.4 2.4-.6 3.6-1.7 4.8C5.8 7 4.5 8.3 4.5 10.4A3.6 3.6 0 0 0 8 14.5a3.7 3.7 0 0 0 3.6-3.7c0-1.3-.6-2.3-1.2-3 .1 1-.3 1.9-1.1 2.3.4-2.4-.1-6.4-.7-9.1Z" />
    </svg>
  )
}

const STYLE: Record<TypeBadge, { libelle: string; classe: string; icone: ReactNode }> = {
  'meilleure-vente': {
    libelle: 'Meilleure vente',
    classe: 'bg-[#17140f] text-[#f3d89f] ring-1 ring-[#d6a756]/60',
    icone: <Couronne />,
  },
  'stock-limite': {
    libelle: 'Stock limité',
    classe: 'bg-[#fbf8f2]/95 text-[#7a2e12]',
    icone: (
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#c2410c]/60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[#c2410c]" />
      </span>
    ),
  },
  'coup-de-coeur': {
    libelle: 'Coup de cœur',
    classe: 'bg-[#fbf8f2]/95 text-[#17140f]',
    icone: <Coeur />,
  },
  'tres-demandee': {
    libelle: 'Très demandée',
    classe: 'bg-[#17140f] text-[#fbf8f2] [&_svg]:text-[#f08a4b]',
    icone: <Flamme />,
  },
  nouveau: {
    libelle: 'Nouveau',
    classe: 'bg-[#fbf8f2]/95 text-[#17140f]',
    icone: <Eclat />,
  },
}

/** Un badge. Couleurs fixes (posé sur une photo) : lisible en thème clair comme sombre. */
export function BadgeArticle({ type, indice = 0 }: { type: TypeBadge; indice?: number }) {
  const s = STYLE[type]
  return (
    <span
      style={{ animationDelay: `${String(120 + indice * 90)}ms` }}
      className={cx(
        'badge-article inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] uppercase shadow-[0_2px_10px_rgb(0_0_0/0.14)] backdrop-blur-sm',
        type === 'coup-de-coeur' && '[&_svg]:text-[#b0263f]',
        type === 'nouveau' && '[&_svg]:text-[#b07a22]',
        s.classe,
      )}
    >
      {s.icone}
      {s.libelle}
    </span>
  )
}
