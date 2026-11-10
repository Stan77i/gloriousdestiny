import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { annoterCliente, detailCliente, listerClientes } from '@/services/clientes.service'
import {
  actionsCommande,
  compterCommandes,
  detailCommande,
  listerCommandes,
  messageWhatsappCommande,
  type StatutCommande,
} from '@/services/commandes.service'

/** Requêtes de l'administration. Les commandes se rafraîchissent seules (file « À confirmer »). */

export function useCommandes(filtre: { statut: StatutCommande | null; recherche: string }) {
  return useQuery({
    queryKey: ['admin', 'commandes', filtre],
    queryFn: () => listerCommandes(filtre),
    refetchInterval: 60_000,
  })
}

export function useCompteurs() {
  return useQuery({
    queryKey: ['admin', 'compteurs'],
    queryFn: compterCommandes,
    refetchInterval: 60_000,
  })
}

export function useCommande(id: string) {
  return useQuery({ queryKey: ['admin', 'commande', id], queryFn: () => detailCommande(id) })
}

export function useMessageWhatsapp(id: string) {
  return useQuery({
    queryKey: ['admin', 'message-whatsapp', id],
    queryFn: () => messageWhatsappCommande(id),
    staleTime: Infinity,
  })
}

export function useCommandesCliente(clienteId: string) {
  return useQuery({
    queryKey: ['admin', 'commandes', 'cliente', clienteId],
    queryFn: () => listerCommandes({ clienteId }),
  })
}

export function useClientes(recherche: string) {
  return useQuery({
    queryKey: ['admin', 'clientes', recherche],
    queryFn: () => listerClientes(recherche),
  })
}

export function useCliente(id: string) {
  return useQuery({ queryKey: ['admin', 'cliente', id], queryFn: () => detailCliente(id) })
}

/** Après toute action, on relit la commande, les listes, les compteurs et la disponibilité publique. */
function useInvalider() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin'] }),
      client.invalidateQueries({ queryKey: ['disponibilites'] }),
    ])
}

type Action =
  | { type: 'confirmer' }
  | { type: 'annuler'; motif: string }
  | { type: 'expedier' }
  | { type: 'livrer' }
  | { type: 'encaisser'; mode: 'especes' | 'mobile_money'; montant: number; reference?: string }
  | { type: 'annoter'; notes: string }

export function useActionCommande(id: string) {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (a: Action) => {
      switch (a.type) {
        case 'confirmer':
          return actionsCommande.confirmer(id)
        case 'annuler':
          return actionsCommande.annuler(id, a.motif)
        case 'expedier':
          return actionsCommande.expedier(id)
        case 'livrer':
          return actionsCommande.livrer(id)
        case 'encaisser':
          return actionsCommande.encaisser(id, a.mode, a.montant, a.reference)
        case 'annoter':
          return actionsCommande.annoter(id, a.notes)
      }
    },
    onSettled: invalider,
  })
}

export function useAnnoterCliente(id: string) {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (notes: string) => annoterCliente(id, notes),
    onSettled: invalider,
  })
}
