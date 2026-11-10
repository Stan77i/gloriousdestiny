import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from './client'

/**
 * Vérifie que l'application joint la base avec la clé publique :
 * lecture des villes actives (table publique en lecture).
 */
export async function verifierConnexionBase(): Promise<{ villes: number }> {
  const { count, error } = await supabase()
    .from('villes')
    .select('id', { count: 'exact', head: true })
  if (error) throw versErreurApp(error)
  return { villes: count ?? 0 }
}
