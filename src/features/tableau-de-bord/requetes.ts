import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { chargerTableauDeBord } from '@/services/tableauDeBord.service'

export function useTableauDeBord(du: string, au: string) {
  return useQuery({
    queryKey: ['admin', 'tableau-de-bord', du, au],
    queryFn: () => chargerTableauDeBord(du, au),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  })
}
