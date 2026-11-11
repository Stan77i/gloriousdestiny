import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enregistrerHoraires,
  listerHoraires,
  listerProduitsAdmin,
  listerServicesAdmin,
  modifierProduit,
  modifierService,
  type schemaProduit,
  type schemaService,
} from '@/services/catalogueAdmin.service'
import type { z } from 'zod'

export function useProduitsAdmin() {
  return useQuery({ queryKey: ['admin', 'catalogue', 'produits'], queryFn: listerProduitsAdmin })
}

export function useServicesAdmin() {
  return useQuery({ queryKey: ['admin', 'catalogue', 'services'], queryFn: listerServicesAdmin })
}

export function useHoraires() {
  return useQuery({ queryKey: ['admin', 'catalogue', 'horaires'], queryFn: listerHoraires })
}

/** Après une modification : l'administration et le site public relisent le catalogue. */
function useRafraichir() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      [
        ['admin'],
        ['produits'],
        ['produit'],
        ['services'],
        ['service'],
        ['disponibilites'],
        ['parametres'],
      ].map((queryKey) => client.invalidateQueries({ queryKey })),
    )
}

export function useModifierProduit() {
  const rafraichir = useRafraichir()
  return useMutation({
    mutationFn: (v: { id: string; saisie: z.output<typeof schemaProduit> }) =>
      modifierProduit(v.id, v.saisie),
    onSuccess: rafraichir,
  })
}

export function useModifierService() {
  const rafraichir = useRafraichir()
  return useMutation({
    mutationFn: (v: { id: string; saisie: z.output<typeof schemaService> }) =>
      modifierService(v.id, v.saisie),
    onSuccess: rafraichir,
  })
}

export function useEnregistrerHoraires() {
  const rafraichir = useRafraichir()
  return useMutation({
    mutationFn: (v: { jours: Parameters<typeof enregistrerHoraires>[0]; resume: string }) =>
      enregistrerHoraires(v.jours, v.resume),
    onSuccess: rafraichir,
  })
}
