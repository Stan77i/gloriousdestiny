import { useQuery } from '@tanstack/react-query'
import { chargerAnalyse } from '@/services/analyse.service'

export function useAnalyse() {
  return useQuery({
    queryKey: ['admin', 'analyse'],
    queryFn: chargerAnalyse,
    staleTime: 5 * 60_000,
  })
}
