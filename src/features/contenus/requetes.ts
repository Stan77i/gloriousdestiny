import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changerStatut,
  enregistrerContenu,
  listerContenusAdmin,
  listerContenusPublics,
  supprimerContenu,
  type Contenu,
  type SaisieContenu,
  type StatutContenu,
  type TypeContenu,
} from '@/services/contenus.service'

export function useContenusAdmin() {
  return useQuery({ queryKey: ['admin', 'contenus'], queryFn: listerContenusAdmin })
}

export function useContenusPublics(filtre: { types?: TypeContenu[]; produitId?: string }) {
  return useQuery({
    queryKey: ['contenus', filtre],
    queryFn: () => listerContenusPublics(filtre),
    staleTime: 5 * 60_000,
  })
}

function useRafraichir() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin', 'contenus'] }),
      client.invalidateQueries({ queryKey: ['contenus'] }),
    ])
}

export function useEnregistrerContenu() {
  const rafraichir = useRafraichir()
  return useMutation({
    mutationFn: (v: {
      id: string | null
      saisie: SaisieContenu
      fichiers: Parameters<typeof enregistrerContenu>[2]
      statut: StatutContenu
    }) => enregistrerContenu(v.id, v.saisie, v.fichiers, v.statut),
    onSuccess: rafraichir,
  })
}

export function useStatutContenu() {
  const rafraichir = useRafraichir()
  return useMutation({
    mutationFn: (v: { id: string; statut: StatutContenu }) => changerStatut(v.id, v.statut),
    onSettled: rafraichir,
  })
}

export function useSupprimerContenu() {
  const rafraichir = useRafraichir()
  return useMutation({ mutationFn: (c: Contenu) => supprimerContenu(c), onSettled: rafraichir })
}
