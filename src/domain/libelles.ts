import type { TonBadge } from '@/components/ui/Badge'
import type { StatutCommande, StatutLivraison, StatutPaiement } from './statuts'

/** Libellés et tons d'affichage des états métier (un mot + une couleur, jamais la couleur seule). */

export const STATUT_COMMANDE: Record<StatutCommande, { libelle: string; ton: TonBadge }> = {
  nouvelle: { libelle: 'À confirmer', ton: 'alerte' },
  confirmee: { libelle: 'Confirmée', ton: 'or' },
  expediee: { libelle: 'Expédiée', ton: 'info' },
  livree: { libelle: 'Livrée', ton: 'succes' },
  annulee: { libelle: 'Annulée', ton: 'neutre' },
  retournee: { libelle: 'Retournée', ton: 'danger' },
}

export const STATUT_PAIEMENT: Record<StatutPaiement, { libelle: string; ton: TonBadge }> = {
  non_paye: { libelle: 'Non payée', ton: 'neutre' },
  paye: { libelle: 'Payée', ton: 'succes' },
  rembourse: { libelle: 'Remboursée', ton: 'info' },
}

export const STATUT_LIVRAISON: Record<StatutLivraison, string> = {
  a_preparer: 'À préparer',
  expediee: 'En route',
  livree: 'Livrée',
  echec: 'Échec',
  retournee: 'Retournée',
}

export const EVENEMENT_COMMANDE: Record<string, string> = {
  creation: 'Commande reçue',
  confirmation: 'Commande confirmée',
  annulation: 'Commande annulée',
  expiration: 'Commande expirée',
  expedition: 'Colis expédié',
  livraison: 'Colis livré',
  paiement: 'Paiement encaissé',
  note: 'Notes modifiées',
  retour: 'Retour enregistré',
}

export const MODE_PAIEMENT: Record<'especes' | 'mobile_money', string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
}

/** Étapes du parcours d'une commande, pour la frise de suivi. */
export const ETAPES_COMMANDE: { statut: StatutCommande; libelle: string }[] = [
  { statut: 'nouvelle', libelle: 'Reçue' },
  { statut: 'confirmee', libelle: 'Confirmée' },
  { statut: 'expediee', libelle: 'Expédiée' },
  { statut: 'livree', libelle: 'Livrée' },
]
