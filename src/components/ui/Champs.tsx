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
  'block w-full border border-filet-champ bg-carte px-4 text-[15px] text-encre transition-[border-color,box-shadow] duration-200 placeholder:text-encre-3 hover:border-encre-3 focus:border-encre focus:shadow-[0_0_0_4px_rgb(214_167_86/0.28)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_4px_rgb(239_106_91/0.2)]'

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
      <label htmlFor={id} className="text-[13px] font-semibold tracking-[0.02em] text-encre-2">
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
        <p id={idAide} className="text-[13px] text-encre-3">
          {aide}
        </p>
      )}
    </div>
  )
}

export function Saisie({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(BASE_CHAMP, 'min-h-12 rounded-champ', className)} {...props} />
}

export function ZoneTexte({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(BASE_CHAMP, 'min-h-28 resize-y rounded-bloc py-3 leading-relaxed', className)}
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
      <select
        className={cx(BASE_CHAMP, 'min-h-12 appearance-none rounded-champ pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-encre-3"
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
        'group inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-encre-2 has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border border-filet-champ bg-carte transition-colors checked:border-encre checked:bg-encre focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-encre"
          {...props}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute inset-0 size-5 scale-75 text-fond opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
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
      <span className="group-hover:text-encre">{libelle}</span>
    </label>
  )
}

/** Interrupteur (case à cocher avec rôle switch) pour les réglages immédiats. */
export function Interrupteur({ libelle, className, ...props }: PropsCase) {
  return (
    <label
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-encre-2 has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          className="peer h-6 w-11 cursor-pointer appearance-none rounded-full border border-filet-champ bg-carte-3 transition-colors checked:border-menthe checked:bg-menthe focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-encre"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-encre-2 shadow transition-transform duration-200 ease-out peer-checked:translate-x-5 peer-checked:bg-sur-menthe"
        />
      </span>
      {libelle}
    </label>
  )
}
