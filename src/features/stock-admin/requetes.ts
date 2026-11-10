import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enregistrerFournisseur,
  listerFournisseurs,
  listerMouvements,
  listerReceptions,
  listerStock,
  operationsStock,
  type Fournisseur,
  type TypeMouvement,
} from '@/services/stock.service'

export function useStock() {
  return useQuery({ queryKey: ['admin', 'stock'], queryFn: listerStock, refetchInterval: 60_000 })
}

export function useMouvements(filtre: { varianteId: string | null; type: TypeMouvement | null }) {
  return useQuery({
    queryKey: ['admin', 'mouvements', filtre],
    queryFn: () => listerMouvements(filtre),
  })
}

export function useReceptions() {
  return useQuery({ queryKey: ['admin', 'receptions'], queryFn: listerReceptions })
}

export function useFournisseurs() {
  return useQuery({ queryKey: ['admin', 'fournisseurs'], queryFn: listerFournisseurs })
}

/** Après une opération de stock : tout ce qui dépend des quantités est relu (admin et site public). */
function useInvalider() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin'] }),
      client.invalidateQueries({ queryKey: ['disponibilites'] }),
    ])
}

type Operation =
  | { type: 'perte'; varianteId: string; quantite: number; motif: string; cle: string }
  | { type: 'inventaire'; varianteId: string; compte: number; motif: string; cle: string }
  | {
      type: 'alertes'
      produitId: string
      seuil: number
      delaiAppro: number | null
      securite: number | null
    }
  | {
      type: 'reception'
      cle: string
      fournisseurId: string | null
      referenceFournisseur: string
      lignes: { varianteId: string; quantite: number; coutUnitaire: number | null }[]
    }
  | {
      type: 'retour'
      commandeId: string
      motif: string
      lignes: { varianteId: string; quantite: number; revendable: boolean }[]
    }

export function useOperationStock() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: async (o: Operation): Promise<unknown> => {
      switch (o.type) {
        case 'perte':
          return operationsStock.perte(o.varianteId, o.quantite, o.motif, o.cle)
        case 'inventaire':
          return operationsStock.inventaire(o.varianteId, o.compte, o.motif, o.cle)
        case 'alertes':
          return operationsStock.alertes(o.produitId, o.seuil, o.delaiAppro, o.securite)
        case 'reception':
          return operationsStock.receptionner(o)
        case 'retour':
          return operationsStock.retour(o.commandeId, o.lignes, o.motif)
      }
    },
    onSettled: invalider,
  })
}

export function useEnregistrerFournisseur() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (f: Omit<Fournisseur, 'id'> & { id?: string }) => enregistrerFournisseur(f),
    onSettled: invalider,
  })
}
