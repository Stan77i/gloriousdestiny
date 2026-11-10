import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Chargeur } from './Chargeur'
import { classesBouton, type TailleBouton, type VarianteBouton } from './classesBouton'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBouton
  taille?: TailleBouton
  enCours?: boolean
  icone?: ReactNode
}

/** Bouton. `enCours` désactive le bouton et annonce le chargement aux lecteurs d'écran. */
export function Bouton({
  variante = 'principal',
  taille = 'normal',
  enCours = false,
  icone,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled === true || enCours}
      aria-busy={enCours || undefined}
      className={classesBouton(variante, taille, className)}
      {...props}
    >
      {enCours ? <Chargeur taille="petit" /> : icone}
      {children}
    </button>
  )
}

type PropsIcone = ButtonHTMLAttributes<HTMLButtonElement> & {
  libelle: string
  variante?: Exclude<VarianteBouton, 'danger'>
  children: ReactNode
}

/** Bouton carré à icône seule ; `libelle` est obligatoire (lu par les lecteurs d'écran). */
export function BoutonIcone({
  libelle,
  variante = 'secondaire',
  className,
  children,
  type = 'button',
  ...props
}: PropsIcone) {
  return (
    <button
      type={type}
      aria-label={libelle}
      title={libelle}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-45 [&_svg]:size-[18px]',
        variante === 'principal' && 'bg-or text-sur-or hover:bg-or-clair',
        variante === 'secondaire' &&
          'border border-filet-fort bg-surface-2 text-ivoire-2 hover:border-or/70 hover:text-ivoire',
        variante === 'fantome' && 'text-ivoire-2 hover:bg-surface-2 hover:text-ivoire',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
