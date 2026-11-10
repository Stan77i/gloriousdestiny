import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '@/lib/cx'

const BASE_CHAMP =
  'block w-full rounded-champ border border-filet-champ bg-surface-1 px-3.5 text-[15px] text-ivoire transition-[border-color,box-shadow] duration-150 placeholder:text-ivoire-3 hover:border-ivoire-3 focus:border-or focus:shadow-[0_0_0_3px_rgb(214_167_86/0.18)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_rgb(239_106_91/0.2)]'

type PropsChamp = {
  libelle: string
  aide?: string | undefined
  erreur?: string | undefined
  obligatoire?: boolean
  className?: string
  children: (attributs: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': true | undefined
    required: boolean | undefined
  }) => ReactNode
}

/**
 * Enveloppe d'un champ : libellé, aide, erreur, liaisons ARIA.
 * Le contrôle reçoit ses attributs par fonction pour rester un vrai élément natif.
 */
export function Champ({ libelle, aide, erreur, obligatoire, className, children }: PropsChamp) {
  const id = useId()
  const idAide = aide ? `${id}-aide` : undefined
  const idErreur = erreur ? `${id}-erreur` : undefined
  const decrit = [idErreur, idAide].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold tracking-[0.02em] text-ivoire-2">
        {libelle}
        {obligatoire && (
          <span className="text-or" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-describedby': decrit,
        'aria-invalid': erreur ? true : undefined,
        required: obligatoire,
      })}
      {erreur && (
        <p id={idErreur} className="text-[13px] text-danger">
          {erreur}
        </p>
      )}
      {aide && !erreur && (
        <p id={idAide} className="text-[13px] text-ivoire-3">
          {aide}
        </p>
      )}
    </div>
  )
}

export function Saisie({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(BASE_CHAMP, 'min-h-12', className)} {...props} />
}

export function ZoneTexte({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(BASE_CHAMP, 'min-h-28 resize-y py-3 leading-relaxed', className)}
      {...props}
    />
  )
}

export function Selection({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(BASE_CHAMP, 'min-h-12 appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ivoire-3"
      />
    </div>
  )
}

type PropsCase = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { libelle: ReactNode }

/** Case à cocher native, dessinée aux couleurs de la marque. */
export function CaseACocher({ libelle, className, ...props }: PropsCase) {
  return (
    <label
      className={cx(
        'group inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-ivoire-2 has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border border-filet-champ bg-surface-1 transition-colors checked:border-or checked:bg-or focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-or"
          {...props}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute inset-0 size-5 scale-75 text-sur-or opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
        >
          <path
            d="M5 10.5 8.5 14 15 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="group-hover:text-ivoire">{libelle}</span>
    </label>
  )
}

/** Interrupteur (case à cocher avec rôle switch) pour les réglages immédiats. */
export function Interrupteur({ libelle, className, ...props }: PropsCase) {
  return (
    <label
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-ivoire-2 has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          className="peer h-6 w-11 cursor-pointer appearance-none rounded-full border border-filet-champ bg-surface-3 transition-colors checked:border-or checked:bg-or focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-or"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-ivoire-2 shadow transition-transform duration-200 ease-out peer-checked:translate-x-5 peer-checked:bg-sur-or"
        />
      </span>
      {libelle}
    </label>
  )
}
