import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  NotificationsContext,
  type Notification,
  type TonNotification,
  type ValeurNotifications,
} from './NotificationsContext'

const DUREE_MS = 5000
const MAX_VISIBLES = 3

const STYLES: Record<TonNotification, string> = {
  succes: 'border-or/60',
  erreur: 'border-red-400/70',
  info: 'border-ivoire/30',
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
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border bg-noir px-4 py-3 text-sm text-ivoire shadow-lg ${STYLES[n.ton]}`}
          >
            <p className="flex-1">{n.message}</p>
            <button
              type="button"
              onClick={() => {
                retirer(n.id)
              }}
              className="text-ivoire/60 hover:text-ivoire focus-visible:outline-or"
              aria-label="Fermer la notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationsContext>
  )
}
