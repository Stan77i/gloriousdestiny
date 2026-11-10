import { createContext } from 'react'

export type TonNotification = 'succes' | 'erreur' | 'info'

export type Notification = {
  id: number
  ton: TonNotification
  message: string
}

export type ValeurNotifications = {
  notifier: (message: string, ton?: TonNotification) => void
  retirer: (id: number) => void
}

export const NotificationsContext = createContext<ValeurNotifications | null>(null)
