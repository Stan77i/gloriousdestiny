import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { chargerCarte, chargerCartePublique } from '@/services/carte.service'

export function useCarte(du: string, au: string) {
  return useQuery({
    queryKey: ['admin', 'carte', du, au],
    queryFn: () => chargerCarte(du, au),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  })
}

/** Présence publique : agrégats anonymes, rafraîchis toutes les 5 minutes au plus. */
export function useCartePublique(actif = true) {
  return useQuery({
    queryKey: ['public', 'carte'],
    queryFn: chargerCartePublique,
    enabled: actif,
    staleTime: 300_000,
  })
}
