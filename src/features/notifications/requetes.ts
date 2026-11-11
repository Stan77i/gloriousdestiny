import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  alertesAPrevenir,
  enregistrerPreferences,
  lirePreferences,
  marquerAlertePrevenue,
  marquerLues,
  mesNotifications,
  type TypeNotification,
} from '@/services/notifications.service'

export function useMesNotifications() {
  return useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: mesNotifications,
    refetchInterval: 60_000,
  })
}

export function useMarquerLues() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[] | null) => marquerLues(ids),
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  })
}

export function usePreferencesNotifications() {
  return useQuery({ queryKey: ['admin', 'preferences-notifications'], queryFn: lirePreferences })
}

export function useEnregistrerPreferences() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (coupes: TypeNotification[]) => enregistrerPreferences(coupes),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'preferences-notifications'] }),
        client.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
      ]),
  })
}

export function useAlertesAPrevenir() {
  return useQuery({ queryKey: ['admin', 'alertes-stock'], queryFn: alertesAPrevenir })
}

export function useAlertePrevenue() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marquerAlertePrevenue(id),
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'alertes-stock'] }),
  })
}
