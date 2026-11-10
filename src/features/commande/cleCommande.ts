import type { LignePanier } from '@/features/panier/panier'

/**
 * Clé d'idempotence d'une tentative de commande : la même tant que le panier ne change pas.
 * Un double clic, un rechargement ou un réseau instable renvoient donc la même commande,
 * jamais une seconde (la base refuse le doublon et rend la commande existante).
 */
const CLE_SESSION = 'gd-commande-en-cours'

export function empreintePanier(lignes: LignePanier[]): string {
  return [...lignes]
    .sort((a, b) => a.varianteId.localeCompare(b.varianteId))
    .map((l) => `${l.varianteId}:${String(l.quantite)}`)
    .join('|')
}

export function cleIdempotence(lignes: LignePanier[]): string {
  const empreinte = empreintePanier(lignes)
  try {
    const brut = sessionStorage.getItem(CLE_SESSION)
    const enCours = brut ? (JSON.parse(brut) as { empreinte?: string; cle?: string }) : null
    if (enCours?.empreinte === empreinte && enCours.cle) return enCours.cle
    const cle = `web-${crypto.randomUUID()}`
    sessionStorage.setItem(CLE_SESSION, JSON.stringify({ empreinte, cle }))
    return cle
  } catch {
    return `web-${crypto.randomUUID()}`
  }
}

export function oublierCleCommande(): void {
  try {
    sessionStorage.removeItem(CLE_SESSION)
  } catch {
    // stockage indisponible : rien à oublier
  }
}

/** Dernière commande passée sur cet appareil (pour afficher le suivi sans ressaisie). */
const CLE_DERNIERE = 'gd-derniere-commande'

export function memoriserDerniereCommande(reference: string, telephone: string): void {
  try {
    sessionStorage.setItem(CLE_DERNIERE, JSON.stringify({ reference, telephone }))
  } catch {
    // facultatif
  }
}

export function telephoneMemorise(reference: string): string | null {
  try {
    const brut = sessionStorage.getItem(CLE_DERNIERE)
    if (!brut) return null
    const d = JSON.parse(brut) as { reference?: string; telephone?: string }
    return d.reference === reference && typeof d.telephone === 'string' ? d.telephone : null
  } catch {
    return null
  }
}
