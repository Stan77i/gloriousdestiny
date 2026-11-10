import { cx } from '@/lib/cx'

export type VarianteBouton = 'principal' | 'secondaire' | 'fantome' | 'danger'
export type TailleBouton = 'petit' | 'normal' | 'grand'

const VARIANTES: Record<VarianteBouton, string> = {
  // Dorure : fond or, reflet qui balaie le bouton au survol.
  principal:
    'bg-or text-sur-or shadow-or bg-[linear-gradient(110deg,transparent_35%,rgb(255_255_255/0.35)_50%,transparent_65%)] bg-[length:250%_100%] bg-[position:120%_0] bg-no-repeat hover:animate-reflet hover:bg-or-clair active:bg-or-fonce',
  secondaire:
    'border border-filet-fort bg-surface-2 text-ivoire hover:border-or/70 hover:bg-surface-3 active:bg-surface-2',
  fantome: 'text-ivoire-2 hover:bg-surface-2 hover:text-ivoire',
  danger: 'border border-danger/50 text-danger hover:bg-danger/10 active:bg-danger/20',
}

const TAILLES: Record<TailleBouton, string> = {
  petit: 'min-h-9 px-3.5 text-[13px] gap-1.5',
  normal: 'min-h-11 px-5 text-sm gap-2',
  grand: 'min-h-13 px-7 text-base gap-2.5',
}

/** Classes d'un bouton, réutilisables sur un lien (`<Link className={classesBouton()}>`). */
export function classesBouton(
  variante: VarianteBouton = 'principal',
  taille: TailleBouton = 'normal',
  extra?: string,
): string {
  return cx(
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.01em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-200 ease-out select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0',
    VARIANTES[variante],
    TAILLES[taille],
    extra,
  )
}
