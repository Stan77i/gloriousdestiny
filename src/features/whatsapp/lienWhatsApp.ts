import type { ParametresPublics } from '@/services/parametres.service'

/**
 * Lien vers la boutique sur WhatsApp.
 * - Avec le numéro (paramètre `whatsapp_numero`) : wa.me/<numéro>?text=<message pré-rempli>.
 * - Avec seulement le lien court (`wa.me/message/…`) : WhatsApp n'accepte pas de texte ;
 *   le lien s'ouvre sans message (voir ARCHITECTURE.md, section H).
 */
export function lienWhatsApp(
  parametres: Pick<ParametresPublics, 'whatsapp_numero' | 'whatsapp_lien'> | undefined,
  message?: string,
): { url: string; preRempli: boolean } | null {
  if (!parametres) return null
  if (parametres.whatsapp_numero) {
    const numero = parametres.whatsapp_numero.replace(/^\+/, '')
    const texte = message ? `?text=${encodeURIComponent(message)}` : ''
    return { url: `https://wa.me/${numero}${texte}`, preRempli: Boolean(message) }
  }
  if (parametres.whatsapp_lien) return { url: parametres.whatsapp_lien, preRempli: false }
  return null
}
