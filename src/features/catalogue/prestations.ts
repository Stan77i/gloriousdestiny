import { useMutation, useQuery } from '@tanstack/react-query'
import { listerPrestations } from '@/services/catalogue.service'
import { demanderPrestation, type NouvelleDemande } from '@/services/prestations.service'

export function usePrestations() {
  return useQuery({ queryKey: ['prestations'], queryFn: listerPrestations, staleTime: 5 * 60_000 })
}

export function useDemandePrestation() {
  return useMutation({ mutationFn: (d: NouvelleDemande) => demanderPrestation(d) })
}
