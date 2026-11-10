import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Commandes. La création et toutes les transitions passent par les fonctions SQL
 * (supabase/migrations/20261111090000_commerce.sql) : le navigateur ne calcule rien qui fasse foi.
 */

const schemaResume = z.object({
  id: z.uuid(),
  reference: z.string(),
  statut: z.enum(['nouvelle', 'confirmee', 'expediee', 'livree', 'annulee', 'retournee']),
  statut_paiement: z.enum(['non_paye', 'paye', 'rembourse']),
  devise: z.enum(['XAF', 'XOF']),
  sous_total_fcfa: z.number().int(),
  frais_livraison_fcfa: z.number().int(),
  total_fcfa: z.number().int(),
  created_at: z.string(),
  reservation_expire_at: z.string().nullable(),
  message_whatsapp: z.string(),
  message_whatsapp_ouvert_at: z.string().nullable(),
  cliente: z.object({ nom: z.string(), telephone: z.string() }),
  livraison: z
    .object({
      ville: z.string(),
      quartier: z.string(),
      adresse: z.string().nullable(),
      point_de_repere: z.string(),
      telephone: z.string(),
      statut: z.string(),
      expediee_at: z.string().nullable(),
      livree_at: z.string().nullable(),
    })
    .nullable(),
  lignes: z.array(
    z.object({
      variante_id: z.uuid(),
      nom: z.string(),
      quantite: z.number().int(),
      prix_unitaire_fcfa: z.number().int(),
      total_fcfa: z.number().int(),
    }),
  ),
})

export type ResumeCommande = z.infer<typeof schemaResume>

export type NouvelleCommande = {
  cleIdempotence: string
  cliente: { nom: string; telephone: string; email?: string | undefined }
  adresse: {
    villeId: number
    quartier: string
    adresse?: string | undefined
    pointDeRepere: string
  }
  lignes: { varianteId: string; quantite: number }[]
  notes?: string | undefined
}

export async function creerCommande(c: NouvelleCommande): Promise<ResumeCommande> {
  const { data, error } = await supabase().rpc('creer_commande', {
    p_commande: {
      cle_idempotence: c.cleIdempotence,
      cliente: {
        nom: c.cliente.nom,
        telephone: c.cliente.telephone,
        email: c.cliente.email ?? null,
      },
      adresse: {
        ville_id: c.adresse.villeId,
        quartier: c.adresse.quartier,
        adresse: c.adresse.adresse ?? null,
        point_de_repere: c.adresse.pointDeRepere,
      },
      lignes: c.lignes.map((l) => ({ variante_id: l.varianteId, quantite: l.quantite })),
      notes: c.notes ?? null,
    },
  })
  if (error) throw versErreurApp(error)
  return schemaResume.parse(data)
}

/** Suivi public : référence + téléphone. `null` si aucune commande ne correspond. */
export async function suivreCommande(
  reference: string,
  telephone: string,
): Promise<ResumeCommande | null> {
  const { data, error } = await supabase().rpc('suivre_commande', {
    p_reference: reference,
    p_telephone: telephone,
  })
  if (error) throw versErreurApp(error)
  return data === null ? null : schemaResume.parse(data)
}

/** Trace l'ouverture de WhatsApp par la cliente (sans bloquer : best effort). */
export async function signalerOuvertureWhatsapp(
  reference: string,
  telephone: string,
): Promise<void> {
  const { error } = await supabase().rpc('signaler_ouverture_whatsapp', {
    p_reference: reference,
    p_telephone: telephone,
  })
  if (error) throw versErreurApp(error)
}

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

export type StatutCommande = ResumeCommande['statut']

export type CommandeListe = {
  id: string
  reference: string
  statut: StatutCommande
  statutPaiement: ResumeCommande['statut_paiement']
  total: number
  creeLe: string
  expireLe: string | null
  cliente: { id: string; nom: string; telephone: string }
  ville: string
}

const CHAMPS_LISTE =
  'id, reference, statut, statut_paiement, total_fcfa, created_at, reservation_expire_at, cliente:clientes!inner(id, nom, telephone), ville:villes!inner(nom)'

type LigneListe = {
  id: string
  reference: string
  statut: StatutCommande
  statut_paiement: ResumeCommande['statut_paiement']
  total_fcfa: number
  created_at: string
  reservation_expire_at: string | null
  cliente: { id: string; nom: string; telephone: string }
  ville: { nom: string }
}

function versListe(l: LigneListe): CommandeListe {
  return {
    id: l.id,
    reference: l.reference,
    statut: l.statut,
    statutPaiement: l.statut_paiement,
    total: l.total_fcfa,
    creeLe: l.created_at,
    expireLe: l.reservation_expire_at,
    cliente: l.cliente,
    ville: l.ville.nom,
  }
}

/** Liste filtrée. La recherche porte sur la référence, le nom ou le téléphone. */
export async function listerCommandes(filtre: {
  statut?: StatutCommande | null
  recherche?: string
  clienteId?: string
}): Promise<CommandeListe[]> {
  let requete = supabase()
    .from('commandes')
    .select(CHAMPS_LISTE)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filtre.statut) requete = requete.eq('statut', filtre.statut)
  if (filtre.clienteId) requete = requete.eq('cliente_id', filtre.clienteId)
  const terme = filtre.recherche?.trim().replace(/[%,()]/g, '')
  if (terme) {
    // Une référence (« GD-… » ou ses chiffres) cherche la commande ; sinon la cliente.
    requete = /^(gd-|\d{4}-)/i.test(terme)
      ? requete.ilike('reference', `%${terme}%`)
      : requete.or(`nom.ilike.%${terme}%,telephone.ilike.%${terme}%`, {
          referencedTable: 'cliente',
        })
  }
  const { data, error } = await requete.overrideTypes<LigneListe[], { merge: false }>()
  if (error) throw versErreurApp(error)
  return data.map(versListe)
}

export const STATUTS_SUIVIS: StatutCommande[] = [
  'nouvelle',
  'confirmee',
  'expediee',
  'livree',
  'annulee',
]

/** Nombre de commandes par statut (onglets de l'administration). */
export async function compterCommandes(): Promise<Record<StatutCommande, number>> {
  const resultats = await Promise.all(
    STATUTS_SUIVIS.map(async (statut) => {
      const { count, error } = await supabase()
        .from('commandes')
        .select('id', { count: 'exact', head: true })
        .eq('statut', statut)
      if (error) throw versErreurApp(error)
      return [statut, count ?? 0] as const
    }),
  )
  return { retournee: 0, ...Object.fromEntries(resultats) } as Record<StatutCommande, number>
}

export type DetailCommande = CommandeListe & {
  devise: 'XAF' | 'XOF'
  sousTotal: number
  fraisLivraison: number
  confirmeeLe: string | null
  annuleeLe: string | null
  motifAnnulation: string | null
  modePaiement: 'especes' | 'mobile_money' | null
  montantEncaisse: number | null
  referencePaiement: string | null
  payeLe: string | null
  notesInternes: string | null
  whatsappOuvertLe: string | null
  lignes: {
    id: string
    varianteId: string
    nom: string
    quantite: number
    quantiteRetournee: number
    prixUnitaire: number
    total: number
  }[]
  livraison: {
    quartier: string
    adresse: string | null
    pointDeRepere: string
    telephone: string
    statut: string
    motifEchec: string | null
    expedieeLe: string | null
    livreeLe: string | null
  } | null
  historique: {
    id: number
    evenement: string
    statutAvant: string | null
    statutApres: string
    motif: string | null
    le: string
  }[]
}

type LigneDetail = LigneListe & {
  devise: 'XAF' | 'XOF'
  sous_total_fcfa: number
  frais_livraison_fcfa: number
  confirmee_at: string | null
  annulee_at: string | null
  motif_annulation: string | null
  mode_paiement: 'especes' | 'mobile_money' | null
  montant_encaisse_fcfa: number | null
  reference_paiement: string | null
  paye_at: string | null
  notes_internes: string | null
  message_whatsapp_ouvert_at: string | null
  lignes: {
    id: string
    variante_id: string
    quantite_retournee: number
    nom_snapshot: string
    quantite: number
    prix_unitaire_snapshot_fcfa: number
    total_ligne_fcfa: number
  }[]
  livraisons: {
    quartier: string
    adresse: string | null
    point_de_repere: string
    telephone: string
    statut: string
    motif_echec: string | null
    expediee_at: string | null
    livree_at: string | null
    created_at: string
  }[]
  historique: {
    id: number
    evenement: string
    statut_avant: string | null
    statut_apres: string
    motif: string | null
    created_at: string
  }[]
}

/** Message WhatsApp exact de la commande, tel que la cliente l'a reçu à envoyer. */
export async function messageWhatsappCommande(id: string): Promise<string> {
  const { data, error } = await supabase().rpc('message_whatsapp_commande', { p_id: id })
  if (error) throw versErreurApp(error)
  return data
}

export async function detailCommande(id: string): Promise<DetailCommande | null> {
  const { data, error } = await supabase()
    .from('commandes')
    .select(
      `${CHAMPS_LISTE}, devise, sous_total_fcfa, frais_livraison_fcfa, confirmee_at, annulee_at, motif_annulation,
       mode_paiement, montant_encaisse_fcfa, reference_paiement, paye_at, notes_internes, message_whatsapp_ouvert_at,
       lignes:commande_lignes(id, variante_id, quantite_retournee, nom_snapshot, quantite, prix_unitaire_snapshot_fcfa, total_ligne_fcfa),
       livraisons(quartier, adresse, point_de_repere, telephone, statut, motif_echec, expediee_at, livree_at, created_at),
       historique:commande_historique(id, evenement, statut_avant, statut_apres, motif, created_at)`,
    )
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<LigneDetail | null, { merge: false }>()
  if (error) throw versErreurApp(error)
  if (!data) return null
  const livraison = [...data.livraisons].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return {
    ...versListe(data),
    devise: data.devise,
    sousTotal: data.sous_total_fcfa,
    fraisLivraison: data.frais_livraison_fcfa,
    confirmeeLe: data.confirmee_at,
    annuleeLe: data.annulee_at,
    motifAnnulation: data.motif_annulation,
    modePaiement: data.mode_paiement,
    montantEncaisse: data.montant_encaisse_fcfa,
    referencePaiement: data.reference_paiement,
    payeLe: data.paye_at,
    notesInternes: data.notes_internes,
    whatsappOuvertLe: data.message_whatsapp_ouvert_at,
    lignes: data.lignes.map((l) => ({
      id: l.id,
      varianteId: l.variante_id,
      nom: l.nom_snapshot,
      quantite: l.quantite,
      quantiteRetournee: l.quantite_retournee,
      prixUnitaire: l.prix_unitaire_snapshot_fcfa,
      total: l.total_ligne_fcfa,
    })),
    livraison: livraison
      ? {
          quartier: livraison.quartier,
          adresse: livraison.adresse,
          pointDeRepere: livraison.point_de_repere,
          telephone: livraison.telephone,
          statut: livraison.statut,
          motifEchec: livraison.motif_echec,
          expedieeLe: livraison.expediee_at,
          livreeLe: livraison.livree_at,
        }
      : null,
    historique: [...data.historique]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({
        id: h.id,
        evenement: h.evenement,
        statutAvant: h.statut_avant,
        statutApres: h.statut_apres,
        motif: h.motif,
        le: h.created_at,
      })),
  }
}

async function appeler(fn: () => PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await fn()
  if (error) throw versErreurApp(error)
}

export const actionsCommande = {
  confirmer: (id: string) => appeler(() => supabase().rpc('confirmer_commande', { p_id: id })),
  annuler: (id: string, motif: string) =>
    appeler(() => supabase().rpc('annuler_commande', { p_id: id, p_motif: motif })),
  expedier: (id: string) => appeler(() => supabase().rpc('expedier_commande', { p_id: id })),
  livrer: (id: string) => appeler(() => supabase().rpc('livrer_commande', { p_id: id })),
  encaisser: (id: string, mode: 'especes' | 'mobile_money', montant: number, reference?: string) =>
    appeler(() =>
      supabase().rpc('enregistrer_paiement', {
        p_id: id,
        p_mode: mode,
        p_montant_fcfa: montant,
        ...(reference ? { p_reference: reference } : {}),
      }),
    ),
  annoter: (id: string, notes: string) =>
    appeler(() => supabase().rpc('annoter_commande', { p_id: id, p_notes: notes })),
}
