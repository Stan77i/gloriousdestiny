/**
 * Ce que dit le guide de la carte, rédigé comme une conversation. Chaque phrase est tirée des
 * données réelles (villes desservies, colis livrés ou en route) : aucun chiffre ni lieu inventé.
 */

/** « au Cameroun », « en Côte d'Ivoire »… */
const PREPOSITION: Record<string, string> = {
  CM: 'au Cameroun',
  CI: 'en Côte d’Ivoire',
  GA: 'au Gabon',
  CG: 'au Congo',
  SN: 'au Sénégal',
  GN: 'en Guinée',
  CA: 'au Canada',
  GB: 'au Royaume-Uni',
}

export function dansLePays(code: string, nom: string): string {
  return PREPOSITION[code] ?? `en ${nom}`
}

function listeVilles(noms: string[]): string {
  const n = noms.slice(0, 2)
  if (n.length === 0) return ''
  if (noms.length > 2) return `à ${n.join(', à ')} et ailleurs`
  return `à ${n.join(' et à ')}`
}

function colis(n: number): string {
  return `${String(n)} colis`
}

/** Phrase d'un pays (ou de la région Afrique) sur les vues Monde et Afrique. */
export function paroleZone(z: {
  code: string
  nom: string
  villes: string[]
  livrees: number
  en_route: number
  pays?: number
}): string {
  if (z.code === 'afrique') {
    return z.livrees > 0
      ? `${colis(z.livrees)} déjà livrés en Afrique, dans ${String(z.pays ?? 0)} pays. Touchez l’Afrique pour voir où !`
      : `En Afrique, on livre dans ${String(z.pays ?? 0)} pays, et vous payez à la réception.`
  }
  const ou = dansLePays(z.code, z.nom)
  const villes = listeVilles(z.villes)
  if (z.en_route > 0)
    return `Psst… un colis est en route ${ou} en ce moment${villes ? `, ${villes}` : ''} !`
  if (z.livrees > 0)
    return `${colis(z.livrees)} déjà livrés ${ou}${villes ? `, ${villes}` : ''}. Le prochain, c’est le vôtre ?`
  return `${z.nom} ? Oui ! On vous livre ${ou}${villes ? `, ${villes}` : ''}. Vous payez à la réception.`
}

/** Phrase d'une ville (vues Afrique zoomée et pays). */
export function paroleVille(v: {
  nom: string
  livrees: number
  en_route: number
  salon: boolean
}): string {
  if (v.salon)
    return `Bienvenue chez nous, à ${v.nom} ! Chaque colis part d’ici, préparé à la main.`
  if (v.en_route > 0)
    return `Un colis roule vers ${v.nom} en ce moment. Bientôt chez sa propriétaire !`
  if (v.livrees > 0)
    return `${colis(v.livrees)} livrés à ${v.nom}. Et le prochain, c’est pour vous ?`
  return `${v.nom} : on vous livre ici aussi. Commandez, vous payez à la réception.`
}
