import { supabase } from './client'

/** Bucket public des images produits (voir migration stockage_images). */
export const BUCKET_PRODUITS = 'produits'

const TYPES_AUTORISES = ['image/webp', 'image/png', 'image/jpeg', 'image/avif'] as const
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024

/** URL publique d'une image produit à partir de son chemin en base (`images_produits.chemin_storage`). */
export function urlImageProduit(chemin: string): string {
  return supabase().storage.from(BUCKET_PRODUITS).getPublicUrl(chemin).data.publicUrl
}

export type ErreurFichier = 'type_non_autorise' | 'trop_lourd'

/** Vérification côté client avant envoi ; le bucket applique les mêmes limites côté serveur. */
export function verifierImage(fichier: File): ErreurFichier | null {
  if (!(TYPES_AUTORISES as readonly string[]).includes(fichier.type)) return 'type_non_autorise'
  if (fichier.size > TAILLE_MAX_OCTETS) return 'trop_lourd'
  return null
}
