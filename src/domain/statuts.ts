/**
 * Valeurs métier partagées. Miroir exact des contraintes CHECK de la base
 * (supabase/migrations/20261110170000_schema_initial.sql) : toute évolution se fait
 * d'abord par migration, puis ici.
 */
export const STATUTS_COMMANDE = [
  'nouvelle',
  'confirmee',
  'expediee',
  'livree',
  'annulee',
  'retournee',
] as const
export type StatutCommande = (typeof STATUTS_COMMANDE)[number]

export const STATUTS_PAIEMENT = ['non_paye', 'paye', 'rembourse'] as const
export type StatutPaiement = (typeof STATUTS_PAIEMENT)[number]

export const MODES_PAIEMENT = ['especes', 'mobile_money'] as const
export type ModePaiement = (typeof MODES_PAIEMENT)[number]

export const STATUTS_LIVRAISON = ['a_preparer', 'expediee', 'livree', 'echec', 'retournee'] as const
export type StatutLivraison = (typeof STATUTS_LIVRAISON)[number]

export const STATUTS_RENDEZ_VOUS = ['demande', 'confirme', 'annule', 'termine', 'absent'] as const
export type StatutRendezVous = (typeof STATUTS_RENDEZ_VOUS)[number]

export const TYPES_MOUVEMENT = [
  'entree',
  'reservation',
  'annulation_reservation',
  'vente',
  'retour',
  'perte',
  'correction',
  'transfert',
  'livraison',
] as const
export type TypeMouvement = (typeof TYPES_MOUVEMENT)[number]

export const DEVISES = ['XAF', 'XOF'] as const
export type Devise = (typeof DEVISES)[number]
