import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Prestations sur demande (pose frontale, traitement, coloration, montage).
 * La cliente envoie une date et une heure souhaitées ; le serveur enregistre la demande « en
 * attente », prévient l'équipe et rédige le message WhatsApp. Rien n'est confirmé tant que
 * l'équipe n'a pas accepté (supabase/migrations/20261112220000_prestations.sql).
 */

export const STATUTS_DEMANDE = ['en_attente', 'acceptee', 'refusee', 'annulee'] as const
export type StatutDemande = (typeof STATUTS_DEMANDE)[number]

const schemaReponse = z.object({
  reference: z.string(),
  statut: z.enum(STATUTS_DEMANDE),
  prestation: z.string(),
  prix_fcfa: z.number().int(),
  message_whatsapp: z.string(),
})
export type ReponseDemande = z.infer<typeof schemaReponse>

export type NouvelleDemande = {
  cleIdempotence: string
  service: string
  nom: string
  telephone: string
  date: string
  heure: string
  precision?: string | undefined
}

export async function demanderPrestation(d: NouvelleDemande): Promise<ReponseDemande> {
  const { data, error } = await supabase().rpc('demander_prestation', {
    p: {
      cle_idempotence: d.cleIdempotence,
      service: d.service,
      nom: d.nom,
      telephone: d.telephone,
      date: d.date,
      heure: d.heure,
      ...(d.precision ? { precision: d.precision } : {}),
    },
  })
  if (error) throw versErreurApp(error)
  const r = schemaReponse.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}

export type DemandePrestation = {
  id: string
  reference: string
  prestation: string
  prix: number
  nom: string
  telephone: string
  date: string
  heure: string
  precision: string | null
  statut: StatutDemande
  creeLe: string
}

/** Demandes reçues (équipe) : en attente d'abord, puis les plus récentes. */
export async function listerDemandesPrestations(): Promise<DemandePrestation[]> {
  const { data, error } = await supabase()
    .from('demandes_prestations')
    .select(
      'id, reference, nom_prestation, prix_fcfa, nom_cliente, telephone, date_souhaitee, heure_souhaitee, precision, statut, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw versErreurApp(error)
  return data
    .map((l) => ({
      id: l.id,
      reference: l.reference,
      prestation: l.nom_prestation,
      prix: l.prix_fcfa,
      nom: l.nom_cliente,
      telephone: l.telephone,
      date: l.date_souhaitee,
      heure: l.heure_souhaitee.slice(0, 5),
      precision: l.precision,
      statut: l.statut as StatutDemande,
      creeLe: l.created_at,
    }))
    .sort((a, b) => Number(b.statut === 'en_attente') - Number(a.statut === 'en_attente'))
}

export async function traiterDemandePrestation(
  id: string,
  statut: Exclude<StatutDemande, 'en_attente'>,
): Promise<void> {
  const { error } = await supabase().rpc('traiter_demande_prestation', {
    p_id: id,
    p_statut: statut,
  })
  if (error) throw versErreurApp(error)
}
