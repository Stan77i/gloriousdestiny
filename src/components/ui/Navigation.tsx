import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Compteur } from './Badge'

export type ElementNav = { id: string; libelle: string; compteur?: number }

/**
 * Barre de navigation en pilules (administration). L'élément actif est doré.
 * `rendreLien` permet d'utiliser NavLink du routeur ; par défaut, des boutons.
 */
export function NavPilules({
  elements,
  actif,
  onChoisir,
  libelle,
  className,
}: {
  elements: ElementNav[]
  actif: string
  onChoisir: (id: string) => void
  libelle: string
  className?: string
}) {
  return (
    <nav aria-label={libelle} className={cx('max-w-full overflow-x-auto', className)}>
      <ul className="inline-flex items-center gap-1 rounded-full bg-carte p-1 shadow-panneau">
        {elements.map((el) => {
          const estActif = el.id === actif
          return (
            <li key={el.id}>
              <button
                type="button"
                aria-current={estActif ? 'page' : undefined}
                onClick={() => {
                  onChoisir(el.id)
                }}
                className={cx(
                  'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                  estActif
                    ? 'bg-encre text-fond'
                    : 'text-encre-2 hover:bg-carte-2 hover:text-encre',
                )}
              >
                {el.libelle}
                {el.compteur !== undefined && <Compteur valeur={el.compteur} actif={estActif} />}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Onglets accessibles (motif WAI-ARIA) : flèches gauche/droite, Début/Fin.
 * Le filet d'or souligne l'onglet actif.
 */
export function Onglets({
  onglets,
  actif,
  onChoisir,
  libelle,
  panneau,
}: {
  onglets: ElementNav[]
  actif: string
  onChoisir: (id: string) => void
  libelle: string
  panneau: ReactNode
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const index = onglets.findIndex((o) => o.id === actif)

  function auClavier(e: KeyboardEvent<HTMLDivElement>) {
    const dernier = onglets.length - 1
    const cibles: Record<string, number> = {
      ArrowRight: index === dernier ? 0 : index + 1,
      ArrowLeft: index === 0 ? dernier : index - 1,
      Home: 0,
      End: dernier,
    }
    const cible = cibles[e.key]
    if (cible === undefined) return
    e.preventDefault()
    const onglet = onglets[cible]
    if (!onglet) return
    onChoisir(onglet.id)
    refs.current[onglet.id]?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={libelle}
        onKeyDown={auClavier}
        className="flex gap-6 overflow-x-auto border-b border-filet"
      >
        {onglets.map((o) => {
          const estActif = o.id === actif
          return (
            <button
              key={o.id}
              ref={(el) => {
                refs.current[o.id] = el
              }}
              type="button"
              role="tab"
              id={`onglet-${o.id}`}
              aria-selected={estActif}
              aria-controls={`panneau-${o.id}`}
              tabIndex={estActif ? 0 : -1}
              onClick={() => {
                onChoisir(o.id)
              }}
              className={cx(
                'relative -mb-px inline-flex min-h-11 items-center gap-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
                estActif
                  ? 'border-encre text-encre'
                  : 'border-transparent text-encre-3 hover:text-encre-2',
              )}
            >
              {o.libelle}
              {o.compteur !== undefined && <Compteur valeur={o.compteur} />}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`panneau-${actif}`}
        aria-labelledby={`onglet-${actif}`}
        tabIndex={0}
        className="pt-5 focus-visible:outline-offset-4"
      >
        {panneau}
      </div>
    </div>
  )
}
