import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { BoutonIcone } from './Bouton'

type Props = {
  ouverte: boolean
  onFermer: () => void
  titre: string
  description?: string
  children: ReactNode
  pied?: ReactNode
  /** `centre` : décision ou confirmation. `tiroir` : panneau latéral (détail, formulaire long). */
  forme?: 'centre' | 'tiroir'
}

/**
 * Fenêtre modale sur l'élément natif <dialog> : piège du focus, touche Échap,
 * retour du focus et fond inerte fournis par le navigateur.
 * À réserver aux tâches qui exigent une interruption.
 */
export function Modale({
  ouverte,
  onFermer,
  titre,
  description,
  children,
  pied,
  forme = 'centre',
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialogue = ref.current
    if (!dialogue) return
    if (ouverte && !dialogue.open) dialogue.showModal()
    if (!ouverte && dialogue.open) dialogue.close()
  }, [ouverte])

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-titre`}
      aria-describedby={description ? `${id}-description` : undefined}
      onClose={onFermer}
      onClick={(e) => {
        // Clic sur le fond (hors du contenu) : fermeture.
        if (e.target === e.currentTarget) onFermer()
      }}
      className={cx(
        'm-0 bg-carte p-0 text-encre shadow-flottant backdrop:transition-opacity open:flex',
        forme === 'centre' &&
          'inset-x-4 top-1/2 mx-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-y-1/2 rounded-panneau transition-[opacity,translate] duration-300 ease-(--ease-sortie) starting:open:translate-y-[-46%] starting:open:opacity-0',
        forme === 'tiroir' &&
          'inset-y-0 right-0 left-auto h-dvh max-h-none w-full max-w-md rounded-l-panneau transition-[opacity,translate] duration-300 ease-(--ease-sortie) starting:open:translate-x-8 starting:open:opacity-0',
      )}
    >
      <div className="flex max-h-[inherit] w-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-filet px-6 py-5">
          <div>
            <h2 id={`${id}-titre`} className="text-[21px] font-semibold tracking-[-0.02em]">
              {titre}
            </h2>
            {description && (
              <p id={`${id}-description`} className="mt-1 text-sm text-encre-3">
                {description}
              </p>
            )}
          </div>
          <BoutonIcone
            libelle="Fermer"
            variante="fantome"
            onClick={onFermer}
            className="-mt-2 -mr-3"
          >
            <X />
          </BoutonIcone>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-encre-2">
          {children}
        </div>
        {pied && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-filet px-6 py-4">
            {pied}
          </footer>
        )}
      </div>
    </dialog>
  )
}
