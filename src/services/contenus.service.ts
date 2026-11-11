import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Contenus (supabase/migrations/20261112130000_contenus.sql) : création en brouillon, fichiers
 * dans le bucket « contenus », publication contrôlée par la base (complétude, accord de la
 * cliente), lecture publique des seuls contenus publiés, dépublication, suppression.
 */

export const TYPES_CONTENU = [
  'temoignage',
  'transformation',
  'video',
  'photo',
  'capture',
  'produit',
] as const
export type TypeContenu = (typeof TYPES_CONTENU)[number]
export type StatutContenu = 'brouillon' | 'publie' | 'depublie'

export const LIBELLE_CONTENU: Record<TypeContenu, string> = {
  temoignage: 'Témoignage',
  transformation: 'Transformation',
  video: 'Vidéo',
  photo: 'Photo',
  capture: 'Capture',
  produit: 'Contenu produit',
}

export type Contenu = {
  id: string
  type: TypeContenu
  titre: string
  texte: string | null
  auteur: string | null
  produitId: string | null
  fichier: string | null
  fichierAvant: string | null
  typeFichier: 'image' | 'video' | null
  videoUrl: string | null
  texteAlternatif: string | null
  consentementCliente: boolean
  statut: StatutContenu
  publieLe: string | null
  ordre: number
  misEnAvant: boolean
}

const CHAMPS =
  'id, type, titre, texte, auteur, produit_id, fichier, fichier_avant, type_fichier, video_url, texte_alternatif, consentement_cliente, statut, publie_at, ordre, mis_en_avant'

type Ligne = {
  id: string
  type: string
  titre: string
  texte: string | null
  auteur: string | null
  produit_id: string | null
  fichier: string | null
  fichier_avant: string | null
  type_fichier: string | null
  video_url: string | null
  texte_alternatif: string | null
  consentement_cliente: boolean
  statut: string
  publie_at: string | null
  ordre: number
  mis_en_avant: boolean
}

function versContenu(l: Ligne): Contenu {
  return {
    id: l.id,
    type: l.type as TypeContenu,
    titre: l.titre,
    texte: l.texte,
    auteur: l.auteur,
    produitId: l.produit_id,
    fichier: l.fichier,
    fichierAvant: l.fichier_avant,
    typeFichier: l.type_fichier as Contenu['typeFichier'],
    videoUrl: l.video_url,
    texteAlternatif: l.texte_alternatif,
    consentementCliente: l.consentement_cliente,
    statut: l.statut as StatutContenu,
    publieLe: l.publie_at,
    ordre: l.ordre,
    misEnAvant: l.mis_en_avant,
  }
}

/** Tous les contenus (administration : la RLS ne les montre qu'à admin et propriétaire). */
export async function listerContenusAdmin(): Promise<Contenu[]> {
  const { data, error } = await supabase()
    .from('contenus')
    .select(CHAMPS)
    .order('created_at', { ascending: false })
  if (error) throw versErreurApp(error)
  return data.map(versContenu)
}

/** Contenus publiés (site public), éventuellement filtrés par type ou par produit. */
export async function listerContenusPublics(filtre: {
  types?: TypeContenu[]
  produitId?: string
}): Promise<Contenu[]> {
  let q = supabase().from('contenus').select(CHAMPS).eq('statut', 'publie')
  if (filtre.types) q = q.in('type', filtre.types)
  if (filtre.produitId) q = q.eq('produit_id', filtre.produitId)
  const { data, error } = await q
    .order('mis_en_avant', { ascending: false })
    .order('ordre')
    .order('publie_at', { ascending: false })
    .limit(24)
  if (error) throw versErreurApp(error)
  return data.map(versContenu)
}

/** Adresse publique d'un fichier du bucket « contenus ». */
export function urlContenu(chemin: string): string {
  return supabase().storage.from('contenus').getPublicUrl(chemin).data.publicUrl
}

const MIMES_IMAGE = ['image/webp', 'image/png', 'image/jpeg', 'image/avif']
const MIMES_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']

/** Vérifie un fichier avant envoi (la base et le bucket revérifient). */
export function verifierFichier(f: File): { type: 'image' | 'video' } | { erreur: string } {
  if (MIMES_IMAGE.includes(f.type)) {
    return f.size <= 8 * 1024 * 1024
      ? { type: 'image' }
      : { erreur: 'Image trop lourde (8 Mo au plus).' }
  }
  if (MIMES_VIDEO.includes(f.type)) {
    return f.size <= 50 * 1024 * 1024
      ? { type: 'video' }
      : { erreur: 'Vidéo trop lourde (50 Mo au plus).' }
  }
  return { erreur: 'Format accepté : JPEG, PNG, WebP, AVIF, MP4, WebM ou MOV.' }
}

/** Envoie un fichier dans le bucket et renvoie son chemin (nom aléatoire, jamais devinable). */
export async function televerser(type: TypeContenu, f: File): Promise<string> {
  const ext = (f.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const chemin = `${type}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase()
    .storage.from('contenus')
    .upload(chemin, f, { contentType: f.type, upsert: false, cacheControl: '31536000' })
  if (error) throw versErreurApp(error)
  return chemin
}

export const schemaContenu = z.object({
  type: z.enum(TYPES_CONTENU),
  titre: z.string().trim().min(2, 'Un titre (2 caractères au moins).').max(120),
  texte: z.string().trim().max(1500),
  auteur: z.string().trim().max(80),
  produitId: z.string(),
  videoUrl: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === '' ||
        /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com)\//.test(
          v,
        ),
      'Lien YouTube, Vimeo, TikTok ou Instagram (https).',
    ),
  texteAlternatif: z.string().trim().max(200),
  consentementCliente: z.boolean(),
  misEnAvant: z.boolean(),
})
export type SaisieContenu = z.infer<typeof schemaContenu>

export async function enregistrerContenu(
  id: string | null,
  s: SaisieContenu,
  fichiers: {
    fichier: string | null
    fichierAvant: string | null
    typeFichier: 'image' | 'video' | null
  },
  statut: StatutContenu,
): Promise<void> {
  const ligne = {
    type: s.type,
    titre: s.titre,
    texte: s.texte || null,
    auteur: s.auteur || null,
    produit_id: s.produitId || null,
    video_url: s.videoUrl || null,
    texte_alternatif: s.texteAlternatif || null,
    consentement_cliente: s.consentementCliente,
    mis_en_avant: s.misEnAvant,
    fichier: fichiers.fichier,
    fichier_avant: fichiers.fichierAvant,
    type_fichier: fichiers.typeFichier,
    statut,
  }
  const { error } = id
    ? await supabase().from('contenus').update(ligne).eq('id', id)
    : await supabase().from('contenus').insert(ligne)
  if (error) throw versErreurApp(error)
}

export async function changerStatut(id: string, statut: StatutContenu): Promise<void> {
  const { error } = await supabase().from('contenus').update({ statut }).eq('id', id)
  if (error) throw versErreurApp(error)
}

/** Supprime le contenu puis ses fichiers (un fichier orphelin serait sans danger, mais inutile). */
export async function supprimerContenu(c: Contenu): Promise<void> {
  const { error } = await supabase().from('contenus').delete().eq('id', c.id)
  if (error) throw versErreurApp(error)
  const fichiers = [c.fichier, c.fichierAvant].filter((f): f is string => f !== null)
  if (fichiers.length > 0) await supabase().storage.from('contenus').remove(fichiers)
}

/** Identifiant YouTube d'un lien (pour l'intégration sans cookies), sinon null. */
export function idYoutube(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/.exec(url)
  return m?.[1] ?? null
}
