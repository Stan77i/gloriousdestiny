import { cx } from '@/lib/cx'

export type VarianteBouton = 'principal' | 'or' | 'sur-menthe' | 'secondaire' | 'fantome' | 'danger'
export type TailleBouton = 'petit' | 'normal' | 'grand'

const VARIANTES: Record<VarianteBouton, string> = {
  // L'encre agit : pilule pleine, inversée en thème sombre. Une seule par écran.
  principal: 'bg-encre text-fond hover:bg-encre-2 active:bg-encre',
  // L'or souligne ce qui compte pour la cliente (commander, réserver) : à réserver au site public.
  or: 'bg-or text-sur-or hover:bg-[color-mix(in_oklab,var(--color-or)_88%,white)] active:bg-or-fonce',
  // Sur une tuile menthe (bloc livraison) : l'encre verte de la tuile.
  'sur-menthe': 'bg-sur-menthe text-menthe hover:bg-sur-menthe/85',
  secondaire:
    'bg-carte text-encre shadow-[inset_0_0_0_1px_var(--color-filet-fort)] hover:bg-carte-2 active:bg-carte-3',
  fantome: 'text-encre-2 hover:bg-carte-2 hover:text-encre',
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
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-300 ease-(--ease-sortie) select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0',
    VARIANTES[variante],
    TAILLES[taille],
    extra,
  )
}
