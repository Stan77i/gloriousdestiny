import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Rendez-vous (architecture, section I). Les créneaux sont calculés par le serveur
 * (supabase/migrations/20261111200000_rendez_vous.sql) ; la réservation et chaque transition
 * passent par des fonctions SQL. Le navigateur ne décide jamais qu'un créneau est libre.
 */

export const STATUTS_RDV = ['demande', 'confirme', 'annule', 'termine', 'absent'] as const
export type StatutRdv = (typeof STATUTS_RDV)[number]

const schemaResumeRdv = z.object({
  id: z.uuid(),
  reference: z.string(),
  statut: z.enum(STATUTS_RDV),
  debut: z.string(),
  fin: z.string(),
  created_at: z.string(),
  motif_annulation: z.string().nullable(),
  annulable: z.boolean(),
  service: z.object({
    slug: z.string(),
    nom: z.string(),
    duree_minutes: z.number().int(),
    prix_fcfa: z.number().int(),
  }),
  cliente: z.object({ nom: z.string(), telephone: z.string() }),
  message_whatsapp: z.string(),
  message_whatsapp_ouvert_at: z.string().nullable(),
})
export type ResumeRdv = z.infer<typeof schemaResumeRdv>

function lireResume(data: unknown): ResumeRdv {
  const r = schemaResumeRdv.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}

/** Créneaux libres (instants ISO) d'une prestation, du jour `du` au jour `au` (heure du salon). */
export async function listerCreneaux(serviceId: string, du: string, au: string): Promise<string[]> {
  const { data, error } = await supabase().rpc('creneaux_disponibles', {
    p_service_id: serviceId,
    p_du: du,
    p_au: au,
  })
  if (error) throw versErreurApp(error)
  return data
}

export type NouvelleReservation = {
  cleIdempotence: string
  serviceId: string
  debut: string
  cliente: { nom: string; telephone: string }
  notes?: string | undefined
}

export async function reserverRendezVous(r: NouvelleReservation): Promise<ResumeRdv> {
  const { data, error } = await supabase().rpc('reserver_rendez_vous', {
    p_rdv: {
      cle_idempotence: r.cleIdempotence,
      service_id: r.serviceId,
      debut: r.debut,
      cliente: r.cliente,
      ...(r.notes ? { notes: r.notes } : {}),
    },
  })
  if (error) throw versErreurApp(error)
  return lireResume(data)
}

export async function suivreRendezVous(
  reference: string,
  telephone: string,
): Promise<ResumeRdv | null> {
  const { data, error } = await supabase().rpc('suivre_rendez_vous', {
    p_reference: reference,
    p_telephone: telephone,
  })
  if (error) throw versErreurApp(error)
  return data === null ? null : lireResume(data)
}

export async function annulerRendezVousCliente(
  reference: string,
  telephone: string,
): Promise<ResumeRdv> {
  const { data, error } = await supabase().rpc('annuler_rendez_vous_cliente', {
    p_reference: reference,
    p_telephone: telephone,
  })
  if (error) throw versErreurApp(error)
  return lireResume(data)
}

export async function signalerOuvertureWhatsappRdv(
  reference: string,
  telephone: string,
): Promise<void> {
  const { error } = await supabase().rpc('signaler_ouverture_whatsapp_rdv', {
    p_reference: reference,
    p_telephone: telephone,
  })
  if (error) throw versErreurApp(error)
}

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

export type RdvAgenda = {
  id: string
  reference: string
  statut: StatutRdv
  debut: string
  fin: string
  service: string
  prix: number | null
  notes: string | null
  motifAnnulation: string | null
  whatsappOuvertLe: string | null
  cliente: { id: string; nom: string; telephone: string }
}

/** Rendez-vous dont le début est dans [du, au[ (instants ISO), du plus proche au plus lointain. */
export async function listerRendezVous(du: string, au: string): Promise<RdvAgenda[]> {
  const { data, error } = await supabase()
    .from('rendez_vous')
    .select(
      'id, reference, statut, debut, fin, service_nom_snapshot, prix_snapshot_fcfa, notes, motif_annulation, message_whatsapp_ouvert_at, cliente:clientes!inner(id, nom, telephone)',
    )
    .gte('debut', du)
    .lt('debut', au)
    .order('debut')
    .overrideTypes<
      {
        id: string
        reference: string
        statut: StatutRdv
        debut: string
        fin: string
        service_nom_snapshot: string | null
        prix_snapshot_fcfa: number | null
        notes: string | null
        motif_annulation: string | null
        message_whatsapp_ouvert_at: string | null
        cliente: { id: string; nom: string; telephone: string }
      }[],
      { merge: false }
    >()
  if (error) throw versErreurApp(error)
  return data.map((r) => ({
    id: r.id,
    reference: r.reference,
    statut: r.statut,
    debut: r.debut,
    fin: r.fin,
    service: r.service_nom_snapshot ?? 'Prestation',
    prix: r.prix_snapshot_fcfa,
    notes: r.notes,
    motifAnnulation: r.motif_annulation,
    whatsappOuvertLe: r.message_whatsapp_ouvert_at,
    cliente: r.cliente,
  }))
}

/** Nombre de demandes à confirmer (rendez-vous à venir). */
export async function compterDemandes(): Promise<number> {
  const { count, error } = await supabase()
    .from('rendez_vous')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'demande')
    .gte('debut', new Date().toISOString())
  if (error) throw versErreurApp(error)
  return count ?? 0
}

export type ActionRdv =
  | { type: 'confirmer'; id: string }
  | { type: 'annuler'; id: string; motif: string }
  | { type: 'cloturer'; id: string; issue: 'termine' | 'absent' }

export async function actionRendezVous(a: ActionRdv): Promise<void> {
  const client = supabase()
  const { error } =
    a.type === 'confirmer'
      ? await client.rpc('confirmer_rendez_vous', { p_id: a.id })
      : a.type === 'annuler'
        ? await client.rpc('annuler_rendez_vous', { p_id: a.id, p_motif: a.motif })
        : await client.rpc('cloturer_rendez_vous', { p_id: a.id, p_issue: a.issue })
  if (error) throw versErreurApp(error)
}

export type Fermeture = { date: string; motif: string | null }

export async function listerFermetures(depuis: string): Promise<Fermeture[]> {
  const { data, error } = await supabase()
    .from('exceptions_disponibilite')
    .select('date, motif')
    .eq('ferme', true)
    .gte('date', depuis)
    .order('date')
  if (error) throw versErreurApp(error)
  return data
}

export async function fermerJournee(date: string, motif: string): Promise<void> {
  const { error } = await supabase().rpc('fermer_journee', { p_date: date, p_motif: motif })
  if (error) throw versErreurApp(error)
}

export async function rouvrirJournee(date: string): Promise<void> {
  const { error } = await supabase().rpc('rouvrir_journee', { p_date: date })
  if (error) throw versErreurApp(error)
}

// ---------------------------------------------------------------------------
// Agenda v2 : blocages, report, rappels (supabase/migrations/20261112100000_agenda_v2.sql)
// ---------------------------------------------------------------------------

export type Blocage = { id: string; debut: string; fin: string; motif: string }

/** Plages bloquées actives qui touchent [du, au[ (instants ISO). */
export async function listerBlocages(du: string, au: string): Promise<Blocage[]> {
  const { data, error } = await supabase()
    .from('blocages_agenda')
    .select('id, debut, fin, motif')
    .is('retire_at', null)
    .lt('debut', au)
    .gt('fin', du)
    .order('debut')
  if (error) throw versErreurApp(error)
  return data
}

export async function bloquerCreneau(debut: string, fin: string, motif: string): Promise<void> {
  const { error } = await supabase().rpc('bloquer_creneau', {
    p_debut: debut,
    p_fin: fin,
    p_motif: motif,
  })
  if (error) throw versErreurApp(error)
}

export async function retirerBlocage(id: string): Promise<void> {
  const { error } = await supabase().rpc('retirer_blocage', { p_id: id })
  if (error) throw versErreurApp(error)
}

/** Créneaux libres pour déplacer un rendez-vous (jour AAAA-MM-JJ, heure du salon). */
export async function creneauxReport(id: string, jour: string): Promise<string[]> {
  const { data, error } = await supabase().rpc('creneaux_report', { p_id: id, p_jour: jour })
  if (error) throw versErreurApp(error)
  return z.array(z.string()).parse(data)
}

export async function reprogrammerRendezVous(id: string, debut: string, motif: string) {
  const { error } = await supabase().rpc('reprogrammer_rendez_vous', {
    p_id: id,
    p_debut: debut,
    p_motif: motif,
  })
  if (error) throw versErreurApp(error)
}

const schemaRappel = z.object({
  id: z.uuid(),
  reference: z.string(),
  debut: z.string(),
  statut: z.enum(['demande', 'confirme']),
  service: z.string(),
  cliente: z.string(),
  telephone: z.string(),
  message: z.string(),
})
export type Rappel = z.infer<typeof schemaRappel>

export async function rappelsAEnvoyer(): Promise<Rappel[]> {
  const { data, error } = await supabase().rpc('rappels_a_envoyer')
  if (error) throw versErreurApp(error)
  return z.array(schemaRappel).parse(data)
}

export async function marquerRappelEnvoye(id: string): Promise<void> {
  const { error } = await supabase().rpc('marquer_rappel_envoye', { p_id: id })
  if (error) throw versErreurApp(error)
}
