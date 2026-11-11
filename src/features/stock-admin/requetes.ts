import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  chargerTableauStock,
  listerCategories,
  listerDeverrouillages,
  listerReglages,
  type NouveauProduit,
  enregistrerFournisseur,
  listerFournisseurs,
  listerMouvements,
  listerReceptions,
  listerStock,
  operationsStock,
  type Fournisseur,
  type TypeMouvement,
} from '@/services/stock.service'

// Relu toutes les 20 s et au retour sur l'onglet : les ventes et les autres comptes sont vus sans recharger.
export function useStock() {
  return useQuery({ queryKey: ['admin', 'stock'], queryFn: listerStock, refetchInterval: 20_000 })
}

export function useTableauStock() {
  return useQuery({
    queryKey: ['admin', 'stock', 'tableau'],
    queryFn: chargerTableauStock,
    refetchInterval: 30_000,
  })
}

export function useCategories() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: listerCategories })
}

export function useDeverrouillages(varianteId: string) {
  return useQuery({
    queryKey: ['admin', 'deverrouillages', varianteId],
    queryFn: () => listerDeverrouillages(varianteId),
  })
}

export function useReglages(varianteId: string) {
  return useQuery({
    queryKey: ['admin', 'reglages', varianteId],
    queryFn: () => listerReglages(varianteId),
  })
}

export function useMouvements(filtre: {
  varianteId: string | null
  type: TypeMouvement | null
  categorieId?: string | null
  du?: string | null
  au?: string | null
  limite?: number
}) {
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
      client.invalidateQueries({ queryKey: ['produits'] }),
      client.invalidateQueries({ queryKey: ['produit'] }),
    ])
}

type Operation =
  | {
      type: 'ajuster'
      varianteId: string
      delta: number
      motif: string
      cle: string
      confirme: boolean
    }
  | { type: 'deverrouiller'; varianteId: string; motif: string }
  | { type: 'creer_produit'; produit: NouveauProduit }
  | {
      type: 'format'
      produitId: string
      unite: string
      prix: number | null
      stockInitial: number
      cle: string
    }
  | {
      type: 'article'
      varianteId: string
      nom: string
      categorieId: string | null
      nouvelleCategorie: string
      typeCategorie: 'perruque' | 'cils' | 'produit'
      unite: string
      seuil: number
    }
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
        case 'ajuster':
          return operationsStock.ajuster(o.varianteId, o.delta, o.motif, o.cle, o.confirme)
        case 'deverrouiller':
          return operationsStock.deverrouiller(o.varianteId, o.motif)
        case 'creer_produit':
          return operationsStock.creerProduit(o.produit)
        case 'format':
          return operationsStock.ajouterFormat(o)
        case 'article':
          return operationsStock.modifierArticle(o)
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
