import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/** Lecture du catalogue publié (la RLS ne renvoie que le contenu publié aux visiteuses). */

export type Disponibilite = 'disponible' | 'bientot_epuise' | 'epuise'

export type Variante = { id: string; sku: string; libelle: string; prix: number }

export type Produit = {
  id: string
  slug: string
  nom: string
  description: string | null
  type: 'perruque' | 'produit' | 'accessoire_cils'
  prix: number
  categorie: { slug: string; nom: string }
  variantes: Variante[]
}

export type Service = {
  id: string
  slug: string
  nom: string
  description: string | null
  type: 'perruque' | 'cils' | 'autre'
  dureeMinutes: number
  prix: number
}

const CHAMPS_PRODUIT =
  'id, slug, nom, description, type, prix_fcfa, categorie:categories!inner(slug, nom), variantes(id, sku, libelle, prix_fcfa, actif)'

type LigneProduit = {
  id: string
  slug: string
  nom: string
  description: string | null
  type: string
  prix_fcfa: number
  categorie: { slug: string; nom: string }
  variantes: {
    id: string
    sku: string
    libelle: string
    prix_fcfa: number | null
    actif: boolean
  }[]
}

function versProduit(l: LigneProduit): Produit {
  return {
    id: l.id,
    slug: l.slug,
    nom: l.nom,
    description: l.description,
    type: l.type as Produit['type'],
    prix: l.prix_fcfa,
    categorie: l.categorie,
    variantes: l.variantes
      .filter((v) => v.actif)
      .map((v) => ({ id: v.id, sku: v.sku, libelle: v.libelle, prix: v.prix_fcfa ?? l.prix_fcfa })),
  }
}

export async function listerProduits(): Promise<Produit[]> {
  const { data, error } = await supabase()
    .from('produits')
    .select(CHAMPS_PRODUIT)
    .order('nom')
    .overrideTypes<LigneProduit[], { merge: false }>()
  if (error) throw versErreurApp(error)
  return data.map(versProduit)
}

export async function produitParSlug(slug: string): Promise<Produit | null> {
  const { data, error } = await supabase()
    .from('produits')
    .select(CHAMPS_PRODUIT)
    .eq('slug', slug)
    .maybeSingle()
    .overrideTypes<LigneProduit | null, { merge: false }>()
  if (error) throw versErreurApp(error)
  return data ? versProduit(data) : null
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

type LigneService = {
  id: string
  slug: string
  nom: string
  description: string | null
  type: string
  duree_minutes: number
  prix_fcfa: number
}

function versService(l: LigneService): Service {
  return {
    id: l.id,
    slug: l.slug,
    nom: l.nom,
    description: l.description,
    type: l.type as Service['type'],
    dureeMinutes: l.duree_minutes,
    prix: l.prix_fcfa,
  }
}

const CHAMPS_SERVICE = 'id, slug, nom, description, type, duree_minutes, prix_fcfa'

export async function listerServices(): Promise<Service[]> {
  const { data, error } = await supabase()
    .from('services')
    .select(CHAMPS_SERVICE)
    .order('prix_fcfa', { ascending: false })
  if (error) throw versErreurApp(error)
  return data.map(versService)
}

export async function serviceParSlug(slug: string): Promise<Service | null> {
  const { data, error } = await supabase()
    .from('services')
    .select(CHAMPS_SERVICE)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw versErreurApp(error)
  return data ? versService(data) : null
}
