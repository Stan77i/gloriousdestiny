import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { chargerCarte } from '@/services/carte.service'

export function useCarte(du: string, au: string) {
  return useQuery({
    queryKey: ['admin', 'carte', du, au],
    queryFn: () => chargerCarte(du, au),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  })
}
