import { useQuery } from '@tanstack/react-query'
import {
  disponibilites,
  listerProduits,
  listerServices,
  produitParSlug,
  serviceParSlug,
} from '@/services/catalogue.service'
import { lireParametresPublics } from '@/services/parametres.service'

/** Requêtes du site public. La disponibilité est relue souvent (stock vivant), le reste est mis en cache. */

export function useProduits() {
  return useQuery({ queryKey: ['produits'], queryFn: listerProduits, staleTime: 5 * 60_000 })
}

export function useProduit(slug: string) {
  return useQuery({
    queryKey: ['produit', slug],
    queryFn: () => produitParSlug(slug),
    staleTime: 5 * 60_000,
  })
}

export function useDisponibilites(varianteIds: string[]) {
  const cle = [...varianteIds].sort()
  return useQuery({
    queryKey: ['disponibilites', cle],
    queryFn: () => disponibilites(cle),
    enabled: cle.length > 0,
    staleTime: 20_000,
  })
}

export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: listerServices, staleTime: 5 * 60_000 })
}

export function useService(slug: string) {
  return useQuery({
    queryKey: ['service', slug],
    queryFn: () => serviceParSlug(slug),
    staleTime: 5 * 60_000,
  })
}

export function useParametresPublics() {
  return useQuery({
    queryKey: ['parametres', 'publics'],
    queryFn: lireParametresPublics,
    staleTime: 10 * 60_000,
  })
}
