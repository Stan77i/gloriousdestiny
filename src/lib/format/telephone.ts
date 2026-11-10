/** Indicatifs des pays desservis (voir table villes). */
export type Indicatif = '+237' | '+225'

/** Longueur du numéro national : Cameroun 9 chiffres, Côte d'Ivoire 10 chiffres. */
const LONGUEURS: Record<Indicatif, number> = { '+237': 9, '+225': 10 }

/**
 * Normalise un numéro saisi en format international E.164 (ex. « 6 90 00 00 01 » → « +237690000001 »).
 * Retourne null si le numéro n'est pas valide pour le pays.
 */
export function normaliserTelephone(saisie: string, indicatif: Indicatif): string | null {
  let chiffres = saisie.replace(/[\s.\-()]/g, '')
  if (chiffres.startsWith('00')) chiffres = `+${chiffres.slice(2)}`
  if (chiffres.startsWith(indicatif)) chiffres = chiffres.slice(indicatif.length)
  else if (chiffres.startsWith('+')) return null
  if (!/^\d+$/.test(chiffres) || chiffres.length !== LONGUEURS[indicatif]) return null
  return `${indicatif}${chiffres}`
}
