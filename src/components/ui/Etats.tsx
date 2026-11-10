import type { ReactNode } from 'react'
import { Bouton } from './Bouton'
import { Chargeur } from './Chargeur'

/** États standard d'un écran : chargement, vide, erreur. */
export function EtatChargement({ libelle = 'Chargement…' }: { libelle?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-ivoire/70">
      <Chargeur libelle={libelle} />
      <p className="text-sm">{libelle}</p>
    </div>
  )
}

export function EtatVide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="text-base text-ivoire">{titre}</p>
      {children && <div className="text-sm text-ivoire/60">{children}</div>}
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
      className="flex min-h-40 flex-col items-center justify-center gap-4 text-center"
    >
      <p className="max-w-md text-sm text-ivoire/80">{message}</p>
      {onReessayer && (
        <Bouton variante="secondaire" onClick={onReessayer}>
          Réessayer
        </Bouton>
      )}
    </div>
  )
}
