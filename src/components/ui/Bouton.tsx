import type { ButtonHTMLAttributes } from 'react'
import { Chargeur } from './Chargeur'

type Variante = 'principal' | 'secondaire' | 'discret'

const VARIANTES: Record<Variante, string> = {
  principal: 'bg-or text-noir hover:bg-or-clair',
  secondaire: 'border border-ivoire/30 text-ivoire hover:border-or hover:text-or',
  discret: 'text-ivoire/80 hover:text-or',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  enCours?: boolean
}

/** Bouton de base. `enCours` désactive le bouton et annonce le chargement. */
export function Bouton({
  variante = 'principal',
  enCours = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled === true || enCours}
      aria-busy={enCours}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {enCours && <Chargeur taille="petit" />}
      {children}
    </button>
  )
}
