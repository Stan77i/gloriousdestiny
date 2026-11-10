import { use } from 'react'
import { NotificationsContext, type ValeurNotifications } from './NotificationsContext'

export function useNotifications(): ValeurNotifications {
  const valeur = use(NotificationsContext)
  if (!valeur) throw new Error('useNotifications doit être utilisé dans <NotificationsProvider>')
  return valeur
}
