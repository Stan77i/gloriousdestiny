import type { TonBadge } from '@/components/ui/Badge'
import type { StatutStock, TypeMouvement } from '@/services/stock.service'

export const STATUT_STOCK: Record<StatutStock, { libelle: string; ton: TonBadge }> = {
  disponible: { libelle: 'En stock', ton: 'succes' },
  bientot_epuise: { libelle: 'Stock bas', ton: 'alerte' },
  epuise: { libelle: 'Épuisé', ton: 'danger' },
}

export const TYPE_MOUVEMENT: Record<TypeMouvement, { libelle: string; ton: TonBadge }> = {
  entree: { libelle: 'Réception', ton: 'succes' },
  reservation: { libelle: 'Réservation', ton: 'or' },
  annulation_reservation: { libelle: 'Annulation', ton: 'neutre' },
  vente: { libelle: 'Vente', ton: 'info' },
  retour: { libelle: 'Retour', ton: 'succes' },
  perte: { libelle: 'Perte', ton: 'danger' },
  correction: { libelle: 'Correction', ton: 'alerte' },
  transfert: { libelle: 'Transfert', ton: 'neutre' },
  livraison: { libelle: 'Livraison', ton: 'neutre' },
}

/** Variation signée lisible : +5, −3, 0 (signe moins typographique). */
export function signe(n: number): string {
  if (n > 0) return `+${String(n)}`
  if (n < 0) return `−${String(Math.abs(n))}`
  return '0'
}
