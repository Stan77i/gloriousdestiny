import type { ReactNode } from 'react'
import { CloudOff, PackageOpen } from 'lucide-react'
import { Bouton } from './Bouton'
import { Chargeur } from './Chargeur'

/** États standard d'une zone : chargement, vide, erreur. Toujours un texte, jamais un écran muet. */
export function EtatChargement({ libelle = 'Chargement…' }: { libelle?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-or">
      <Chargeur libelle={libelle} />
      <p className="text-sm text-ivoire-3">{libelle}</p>
    </div>
  )
}

export function EtatVide({
  titre,
  children,
  action,
  icone = <PackageOpen />,
}: {
  titre: string
  children?: ReactNode
  action?: ReactNode
  icone?: ReactNode
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-filet-fort text-ivoire-3 [&_svg]:size-5"
      >
        {icone}
      </span>
      <p className="text-base font-semibold text-ivoire">{titre}</p>
      {children && <div className="max-w-sm text-sm leading-relaxed text-ivoire-3">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function EtatErreur({
  message,
  onReessayer,
}: {
  message: string
  onReessayer?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-danger/40 text-danger [&_svg]:size-5"
      >
        <CloudOff />
      </span>
      <p className="max-w-md text-sm leading-relaxed text-ivoire-2">{message}</p>
      {onReessayer && (
        <Bouton variante="secondaire" taille="petit" onClick={onReessayer}>
          Réessayer
        </Bouton>
      )}
    </div>
  )
}
