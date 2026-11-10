import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import {
  NotificationsContext,
  type Notification,
  type TonNotification,
  type ValeurNotifications,
} from './NotificationsContext'

const DUREE_MS = 5000
const MAX_VISIBLES = 3

const STYLES: Record<TonNotification, { icone: ReactNode; couleur: string }> = {
  succes: { icone: <CircleCheck />, couleur: 'text-succes' },
  erreur: { icone: <CircleAlert />, couleur: 'text-danger' },
  info: { icone: <Info />, couleur: 'text-or' },
}

/**
 * Notifications éphémères (toasts). Région aria-live : les lecteurs d'écran annoncent
 * chaque message. Les erreurs restent jusqu'à fermeture manuelle.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<Notification[]>([])
  const compteur = useRef(0)

  const retirer = useCallback((id: number) => {
    setListe((actuelles) => actuelles.filter((n) => n.id !== id))
  }, [])

  const notifier = useCallback(
    (message: string, ton: TonNotification = 'info') => {
      compteur.current += 1
      const id = compteur.current
      setListe((actuelles) => [...actuelles, { id, ton, message }].slice(-MAX_VISIBLES))
      if (ton !== 'erreur') {
        setTimeout(() => {
          retirer(id)
        }, DUREE_MS)
      }
    },
    [retirer],
  )

  const valeur = useMemo<ValeurNotifications>(() => ({ notifier, retirer }), [notifier, retirer])

  return (
    <NotificationsContext value={valeur}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6"
      >
        {liste.map((n) => (
          <div
            key={n.id}
            role={n.ton === 'erreur' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border border-filet-fort bg-surface-2 py-3 pr-2 pl-4 text-sm text-ivoire shadow-flottant transition-[opacity,translate] duration-300 ease-(--ease-sortie) starting:translate-y-2 starting:opacity-0"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 [&_svg]:size-[18px] ${STYLES[n.ton].couleur}`}
            >
              {STYLES[n.ton].icone}
            </span>
            <p className="flex-1 py-0.5 leading-relaxed">{n.message}</p>
            <button
              type="button"
              onClick={() => {
                retirer(n.id)
              }}
              className="grid size-8 shrink-0 place-items-center rounded-full text-ivoire-3 transition-colors hover:bg-surface-3 hover:text-ivoire [&_svg]:size-4"
              aria-label="Fermer la notification"
            >
              <X />
            </button>
          </div>
        ))}
      </div>
    </NotificationsContext>
  )
}
