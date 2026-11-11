import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Notifications (supabase/migrations/20261112110000_notifications.sql). Elles sont créées par la
 * base (déclencheurs et tâche planifiée), jamais par le navigateur. Ici : lecture, lu / non lu,
 * préférences, et les deux files d'action de l'équipe (clientes à prévenir d'un retour en stock).
 */

export const TYPES_NOTIFICATION = [
  'commande_nouvelle',
  'commande_attente',
  'rdv_nouveau',
  'rdv_rappels',
  'stock_bas',
  'stock_epuise',
  'retour_stock',
  'alerte_stock_demandee',
] as const
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number]

export const LIBELLE_TYPE: Record<TypeNotification, string> = {
  commande_nouvelle: 'Nouvelles commandes',
  commande_attente: 'Commandes en attente de confirmation',
  rdv_nouveau: 'Nouveaux rendez-vous',
  rdv_rappels: 'Rappels de rendez-vous à envoyer',
  stock_bas: 'Stock bas',
  stock_epuise: 'Rupture de stock',
  retour_stock: 'Retour en stock',
  alerte_stock_demandee: 'Demandes « prévenez-moi »',
}

const schemaNotification = z.object({
  id: z.number().int(),
  type: z.enum(TYPES_NOTIFICATION),
  titre: z.string(),
  corps: z.string(),
  lien: z.string().nullable(),
  created_at: z.string(),
  lue: z.boolean(),
})
export type Notification = z.infer<typeof schemaNotification>

const schemaBoite = z.object({ non_lues: z.number().int(), liste: z.array(schemaNotification) })
export type BoiteNotifications = z.infer<typeof schemaBoite>

export async function mesNotifications(): Promise<BoiteNotifications> {
  const { data, error } = await supabase().rpc('mes_notifications', { p_limite: 40 })
  if (error) throw versErreurApp(error)
  return schemaBoite.parse(data)
}

export async function marquerLues(ids: number[] | null): Promise<void> {
  const { error } = await supabase().rpc(
    'marquer_notifications_lues',
    ids === null ? {} : { p_ids: ids },
  )
  if (error) throw versErreurApp(error)
}

export async function lirePreferences(): Promise<TypeNotification[]> {
  const { data, error } = await supabase()
    .from('preferences_notifications')
    .select('types_coupes')
    .maybeSingle()
  if (error) throw versErreurApp(error)
  return (data?.types_coupes ?? []).filter((t): t is TypeNotification =>
    (TYPES_NOTIFICATION as readonly string[]).includes(t),
  )
}

export async function enregistrerPreferences(coupes: TypeNotification[]): Promise<void> {
  const { error } = await supabase().rpc('enregistrer_preferences_notifications', {
    p_types_coupes: coupes,
  })
  if (error) throw versErreurApp(error)
}

const schemaAlerte = z.object({
  id: z.uuid(),
  nom: z.string(),
  telephone: z.string(),
  produit: z.string(),
  disponible: z.number().int(),
  demande_le: z.string(),
  message: z.string(),
})
export type AlerteAPrevenir = z.infer<typeof schemaAlerte>

export async function alertesAPrevenir(): Promise<AlerteAPrevenir[]> {
  const { data, error } = await supabase().rpc('alertes_a_prevenir')
  if (error) throw versErreurApp(error)
  return z.array(schemaAlerte).parse(data)
}

export async function marquerAlertePrevenue(id: string): Promise<void> {
  const { error } = await supabase().rpc('marquer_alerte_prevenue', { p_id: id })
  if (error) throw versErreurApp(error)
}

/** Demande publique « Prévenez-moi au retour en stock » (consentement explicite obligatoire). */
export async function demanderAlerteRetourStock(d: {
  varianteId: string
  nom: string
  telephone: string
  consentement: boolean
}): Promise<'enregistree' | 'disponible'> {
  const { data, error } = await supabase().rpc('demander_alerte_retour_stock', {
    p_variante_id: d.varianteId,
    p_nom: d.nom,
    p_telephone: d.telephone,
    p_consentement: d.consentement,
  })
  if (error) throw versErreurApp(error)
  return z.enum(['enregistree', 'disponible']).parse(data)
}
