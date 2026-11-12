import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/** Lecture du catalogue publié (la RLS ne renvoie que le contenu publié aux visiteuses). */

export type Disponibilite = 'disponible' | 'bientot_epuise' | 'epuise'

/**
 * Fiche de vente (colonne `produits.fiche`). Lecture tolérante : un champ mal formé est ignoré,
 * jamais la page entière ; une fiche vide laisse la page sur la seule description.
 */
const schemaFiche = z.object({
  accroche: z.string().min(1).optional().catch(undefined),
  histoire: z.string().min(1).optional().catch(undefined),
  benefices: z.array(z.string().min(1)).catch([]).default([]),
  utilisation: z.array(z.string().min(1)).catch([]).default([]),
  conseil: z.string().min(1).optional().catch(undefined),
  faq: z
    .array(z.object({ q: z.string().min(1), r: z.string().min(1) }))
    .catch([])
    .default([]),
  associes: z.array(z.string().min(1)).catch([]).default([]),
})
export type FicheProduit = z.infer<typeof schemaFiche>

export function lireFiche(brute: unknown): FicheProduit {
  const r = schemaFiche.safeParse(brute ?? {})
  return r.success ? r.data : schemaFiche.parse({})
}

/**
 * Format vendu. `prix` est le prix effectif (promotion comprise, celui que le serveur facture) ;
 * `promo` n'existe que si une promotion réelle est en cours : `prixBase` est alors le prix du
 * catalogue, jamais un prix inventé.
 */
export type Variante = {
  id: string
  sku: string
  libelle: string
  prix: number
  promo: { prixBase: number; reduction: number; fin: string | null; libelle: string | null } | null
}

export type Produit = {
  id: string
  slug: string
  nom: string
  description: string | null
  fiche: FicheProduit
  type: 'perruque' | 'produit' | 'accessoire_cils'
  prix: number
  categorie: { slug: string; nom: string }
  variantes: Variante[]
  /** Date de création : sert uniquement à signaler une vraie nouveauté. */
  creeLe: string
  /** Badges, tous vrais : choix de l'équipe, nouveauté datée, ventes réelles. */
  badges: { coupDeCoeur: boolean; nouveau: boolean; meilleureVente: boolean }
}

const CHAMPS_PRODUIT =
  'id, slug, nom, description, fiche, type, prix_fcfa, created_at, coup_de_coeur, nouveau_jusqu_au, categorie:categories!inner(slug, nom), variantes(id, sku, libelle, prix_fcfa, actif)'

type LigneProduit = {
  id: string
  slug: string
  nom: string
  description: string | null
  fiche: unknown
  type: string
  prix_fcfa: number
  created_at: string
  coup_de_coeur: boolean
  nouveau_jusqu_au: string | null
  categorie: { slug: string; nom: string }
  variantes: {
    id: string
    sku: string
    libelle: string
    prix_fcfa: number | null
    actif: boolean
  }[]
}

type Promo = {
  prixBase: number
  prixPromo: number
  reduction: number
  fin: string | null
  libelle: string | null
}

/** Promotions en cours (calculées par le serveur), par format. Expirées : ignorées ici aussi. */
async function promotionsEnCours(): Promise<Map<string, Promo>> {
  const { data, error } = await supabase().rpc('promotions_en_cours')
  if (error) throw versErreurApp(error)
  const maintenant = Date.now()
  // `fin` est nullable en base (promotion sans date de fin), même si le type généré l'ignore.
  type Ligne = {
    variante_id: string
    prix_base: number
    prix_promo: number
    reduction: number
    fin: string | null
    libelle: string | null
  }
  const lignes: Ligne[] = data
  return new Map(
    lignes
      .filter((x) => x.fin === null || new Date(x.fin).getTime() > maintenant)
      .map((x) => [
        x.variante_id,
        {
          prixBase: x.prix_base,
          prixPromo: x.prix_promo,
          reduction: x.reduction,
          fin: x.fin,
          libelle: x.libelle,
        },
      ]),
  )
}

/** Produits les plus vendus (calcul serveur sur les ventes réelles ; vide sans ventes). */
async function meilleuresVentes(): Promise<Set<string>> {
  const { data, error } = await supabase().rpc('meilleures_ventes')
  // Badge secondaire : en cas d'échec, le catalogue s'affiche sans lui.
  if (error) return new Set()
  return new Set(data)
}

function aujourdhui(): string {
  const d = new Date()
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function versProduit(l: LigneProduit, promos: Map<string, Promo>, top: Set<string>): Produit {
  return {
    id: l.id,
    slug: l.slug,
    nom: l.nom,
    description: l.description,
    fiche: lireFiche(l.fiche),
    type: l.type as Produit['type'],
    prix: l.prix_fcfa,
    categorie: l.categorie,
    creeLe: l.created_at,
    badges: {
      coupDeCoeur: l.coup_de_coeur,
      nouveau: l.nouveau_jusqu_au !== null && l.nouveau_jusqu_au >= aujourdhui(),
      meilleureVente: top.has(l.id),
    },
    variantes: l.variantes
      .filter((v) => v.actif)
      .map((v) => {
        const promo = promos.get(v.id)
        return {
          id: v.id,
          sku: v.sku,
          libelle: v.libelle,
          prix: promo ? promo.prixPromo : (v.prix_fcfa ?? l.prix_fcfa),
          promo: promo
            ? {
                prixBase: promo.prixBase,
                reduction: promo.reduction,
                fin: promo.fin,
                libelle: promo.libelle,
              }
            : null,
        }
      })
      // Du plus petit format au plus grand (le prix suit la contenance).
      .sort((a, b) => a.prix - b.prix || a.sku.localeCompare(b.sku)),
  }
}

export async function listerProduits(): Promise<Produit[]> {
  const [{ data, error }, promos, top] = await Promise.all([
    supabase()
      .from('produits')
      .select(CHAMPS_PRODUIT)
      .order('nom')
      .overrideTypes<LigneProduit[], { merge: false }>(),
    promotionsEnCours(),
    meilleuresVentes(),
  ])
  if (error) throw versErreurApp(error)
  return data.map((l) => versProduit(l, promos, top))
}

export async function produitParSlug(slug: string): Promise<Produit | null> {
  const [{ data, error }, promos, top] = await Promise.all([
    supabase()
      .from('produits')
      .select(CHAMPS_PRODUIT)
      .eq('slug', slug)
      .maybeSingle()
      .overrideTypes<LigneProduit | null, { merge: false }>(),
    promotionsEnCours(),
    meilleuresVentes(),
  ])
  if (error) throw versErreurApp(error)
  return data ? versProduit(data, promos, top) : null
}

const STATUTS = new Set<Disponibilite>(['disponible', 'bientot_epuise', 'epuise'])

/** Statut de disponibilité par variante. Une variante absente de la réponse est considérée épuisée. */
export async function disponibilites(varianteIds: string[]): Promise<Map<string, Disponibilite>> {
  const carte = new Map<string, Disponibilite>()
  if (varianteIds.length === 0) return carte
  const { data, error } = await supabase().rpc('disponibilite_variantes', {
    p_variante_ids: varianteIds,
  })
  if (error) throw versErreurApp(error)
  for (const ligne of data) {
    const statut = ligne.statut as Disponibilite
    carte.set(ligne.variante_id, STATUTS.has(statut) ? statut : 'epuise')
  }
  return carte
}

/** Prestation capillaire sur demande (rubrique « Nos prestations »). */
export type Prestation = {
  id: string
  slug: string
  nom: string
  description: string | null
  prix: number
  /** URL publique de la photo, ou null tant qu'aucune photo n'a été déposée. */
  photo: string | null
  /** Badges vrais : choix de l'équipe, et demandes réelles (calcul serveur). */
  badges: { coupDeCoeur: boolean; tresDemandee: boolean }
}

export function urlPhotoPrestation(chemin: string | null): string | null {
  if (!chemin) return null
  return supabase().storage.from('produits').getPublicUrl(chemin).data.publicUrl
}

export async function listerPrestations(): Promise<Prestation[]> {
  const [{ data, error }, demandees] = await Promise.all([
    supabase()
      .from('services')
      .select('id, slug, nom, description, prix_fcfa, image, coup_de_coeur')
      .eq('mode_reservation', 'demande')
      .eq('publie', true)
      .is('archive_at', null)
      .order('ordre'),
    // Badge secondaire : en cas d'échec, les prestations s'affichent sans lui.
    supabase()
      .rpc('prestations_tres_demandees')
      .then((r) => new Set(r.error ? [] : r.data)),
  ])
  if (error) throw versErreurApp(error)
  return data.map((l) => ({
    id: l.id,
    slug: l.slug,
    nom: l.nom,
    description: l.description,
    prix: l.prix_fcfa,
    photo: urlPhotoPrestation(l.image),
    badges: { coupDeCoeur: l.coup_de_coeur, tresDemandee: demandees.has(l.id) },
  }))
}
