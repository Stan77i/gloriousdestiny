import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Catalogue côté administration (architecture, D4 et D5). Écriture directe sur les tables,
 * autorisée par la RLS au seul rôle admin/propriétaire ; chaque modification est tracée par
 * le journal d'audit de la base (déclencheur private.journaliser).
 */

export type ProduitAdmin = {
  id: string
  nom: string
  categorie: string
  type: string
  prixFcfa: number
  publie: boolean
  description: string
  seuilAlerte: number
  delaiApproJours: number | null
  stockSecuriteJours: number | null
}

export async function listerProduitsAdmin(): Promise<ProduitAdmin[]> {
  const { data, error } = await supabase()
    .from('produits')
    .select(
      'id, nom, type, prix_fcfa, publie, description, seuil_alerte, delai_appro_jours, stock_securite_jours, categorie:categories!inner(nom)',
    )
    .is('archive_at', null)
    .order('nom')
  if (error) throw versErreurApp(error)
  return data.map((p) => ({
    id: p.id,
    nom: p.nom,
    categorie: p.categorie.nom,
    type: p.type,
    prixFcfa: p.prix_fcfa,
    publie: p.publie,
    description: p.description ?? '',
    seuilAlerte: p.seuil_alerte,
    delaiApproJours: p.delai_appro_jours,
    stockSecuriteJours: p.stock_securite_jours,
  }))
}

const entierOuVide = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null
      const n = Number(v.replace(/\s/g, ''))
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({
          code: 'custom',
          message: `Nombre entier entre ${String(min)} et ${String(max)}`,
        })
        return z.NEVER
      }
      return n
    })

const entierRequis = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = Number(v.replace(/\s/g, ''))
      if (v === '' || !Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return n
    })

/** Formulaire produit : champs texte du navigateur → valeurs vérifiées. */
export const schemaProduit = z.object({
  prix: entierRequis(0, 10_000_000, 'Indiquez un prix en FCFA (nombre entier).'),
  publie: z.boolean(),
  description: z.string().trim().max(1000, '1 000 caractères au plus'),
  seuilAlerte: entierRequis(0, 10_000, 'Indiquez un seuil (0 ou plus).'),
  delaiAppro: entierOuVide(1, 365),
  stockSecurite: entierOuVide(0, 365),
})
export type SaisieProduit = z.input<typeof schemaProduit>

export async function modifierProduit(id: string, saisie: z.output<typeof schemaProduit>) {
  const { error } = await supabase()
    .from('produits')
    .update({
      prix_fcfa: saisie.prix,
      publie: saisie.publie,
      description: saisie.description === '' ? null : saisie.description,
      seuil_alerte: saisie.seuilAlerte,
      delai_appro_jours: saisie.delaiAppro,
      stock_securite_jours: saisie.stockSecurite,
    })
    .eq('id', id)
  if (error) throw versErreurApp(error)
}

export type ServiceAdmin = {
  id: string
  nom: string
  description: string
  /** creneau : agenda du salon ; demande : rubrique « Nos prestations » (date souhaitée). */
  mode: 'creneau' | 'demande'
  /** Chemin de la photo dans le bucket « produits » (prestations sur demande). */
  image: string | null
  dureeMinutes: number
  tamponApresMinutes: number
  prixFcfa: number
  publie: boolean
}

export async function listerServicesAdmin(): Promise<ServiceAdmin[]> {
  const { data, error } = await supabase()
    .from('services')
    .select(
      'id, nom, description, mode_reservation, image, ordre, duree_minutes, tampon_apres_minutes, prix_fcfa, publie',
    )
    .is('archive_at', null)
    .order('mode_reservation', { ascending: false })
    .order('ordre')
    .order('nom')
  if (error) throw versErreurApp(error)
  return data.map((s) => ({
    id: s.id,
    nom: s.nom,
    description: s.description ?? '',
    mode: s.mode_reservation === 'demande' ? 'demande' : 'creneau',
    image: s.image,
    dureeMinutes: s.duree_minutes ?? 0,
    tamponApresMinutes: s.tampon_apres_minutes,
    prixFcfa: s.prix_fcfa,
    publie: s.publie,
  }))
}

export const schemaService = z.object({
  prix: entierRequis(0, 10_000_000, 'Indiquez un prix en FCFA (nombre entier).'),
  duree: entierRequis(5, 720, 'Durée entre 5 et 720 minutes.'),
  tampon: entierRequis(0, 240, 'Entre 0 et 240 minutes.'),
  publie: z.boolean(),
  description: z.string().trim().max(1000, '1 000 caractères au plus'),
})
export type SaisieService = z.input<typeof schemaService>

export async function modifierService(id: string, saisie: z.output<typeof schemaService>) {
  const { error } = await supabase()
    .from('services')
    .update({
      prix_fcfa: saisie.prix,
      duree_minutes: saisie.duree,
      tampon_apres_minutes: saisie.tampon,
      publie: saisie.publie,
      description: saisie.description === '' ? null : saisie.description,
    })
    .eq('id', id)
  if (error) throw versErreurApp(error)
}

/** Prestation sur demande : nom, texte, prix, photo, disponibilité (un seul endroit). */
export const schemaPrestation = z.object({
  nom: z.string().trim().min(2, 'Un nom (2 caractères au moins).').max(80),
  prix: entierRequis(0, 10_000_000, 'Indiquez un prix en FCFA (nombre entier).'),
  publie: z.boolean(),
  description: z.string().trim().max(1000, '1 000 caractères au plus'),
})
export type SaisiePrestation = z.input<typeof schemaPrestation>

export async function modifierPrestation(
  id: string,
  saisie: z.output<typeof schemaPrestation>,
  image?: string | null,
) {
  const { error } = await supabase()
    .from('services')
    .update({
      nom: saisie.nom,
      prix_fcfa: saisie.prix,
      publie: saisie.publie,
      description: saisie.description === '' ? null : saisie.description,
      ...(image === undefined ? {} : { image }),
    })
    .eq('id', id)
    .eq('mode_reservation', 'demande')
  if (error) throw versErreurApp(error)
}

const MIMES_PHOTO = ['image/webp', 'image/png', 'image/jpeg', 'image/avif']

export function verifierPhotoPrestation(f: File): string | null {
  if (!MIMES_PHOTO.includes(f.type)) return 'Format accepté : JPEG, PNG, WebP ou AVIF.'
  if (f.size > 5 * 1024 * 1024) return 'Photo trop lourde (5 Mo au plus).'
  return null
}

/** Envoie la photo (nom aléatoire) et renvoie son chemin dans le bucket « produits ». */
export async function televerserPhotoPrestation(f: File): Promise<string> {
  const ext = (f.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const chemin = `prestations/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase()
    .storage.from('produits')
    .upload(chemin, f, { contentType: f.type, upsert: false, cacheControl: '31536000' })
  if (error) throw versErreurApp(error)
  return chemin
}

/** Plage d'ouverture du salon pour un jour de la semaine (0 = dimanche … 6 = samedi). */
export type Horaire = {
  id: string
  jourSemaine: number
  debut: string
  fin: string
  actif: boolean
}

export async function listerHoraires(): Promise<Horaire[]> {
  const { data, error } = await supabase()
    .from('disponibilites_services')
    .select('id, jour_semaine, heure_debut, heure_fin, actif')
    .order('jour_semaine')
    .order('heure_debut')
  if (error) throw versErreurApp(error)
  return data.map((h) => ({
    id: h.id,
    jourSemaine: h.jour_semaine,
    debut: h.heure_debut.slice(0, 5),
    fin: h.heure_fin.slice(0, 5),
    actif: h.actif,
  }))
}

/**
 * Enregistre les horaires de la semaine (une plage par jour) puis met à jour le texte public
 * « horaires_salon ». Un jour fermé garde sa ligne, désactivée : rien n'est supprimé.
 */
export async function enregistrerHoraires(
  jours: { jourSemaine: number; id: string | null; ouvert: boolean; debut: string; fin: string }[],
  resume: string,
) {
  const client = supabase()
  for (const j of jours) {
    if (j.id) {
      const { error } = await client
        .from('disponibilites_services')
        .update({ actif: j.ouvert, heure_debut: j.debut, heure_fin: j.fin })
        .eq('id', j.id)
      if (error) throw versErreurApp(error)
    } else if (j.ouvert) {
      const { error } = await client.from('disponibilites_services').insert({
        jour_semaine: j.jourSemaine,
        heure_debut: j.debut,
        heure_fin: j.fin,
        pas_minutes: 30,
      })
      if (error) throw versErreurApp(error)
    }
  }
  const { error } = await client
    .from('parametres')
    .update({ valeur: resume })
    .eq('cle', 'horaires_salon')
  if (error) throw versErreurApp(error)
}
