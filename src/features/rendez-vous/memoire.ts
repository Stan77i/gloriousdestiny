/**
 * Clé d'idempotence d'une tentative de réservation : la même pour une même prestation au même
 * créneau. Un double clic ou un réseau instable renvoient le même rendez-vous, jamais un second.
 * Et le téléphone de la dernière réservation, pour afficher son suivi sans ressaisie.
 */
const CLE_TENTATIVE = 'gd-rdv-en-cours'
const CLE_DERNIER = 'gd-dernier-rdv'

export function cleReservation(serviceId: string, debut: string): string {
  const empreinte = `${serviceId}@${debut}`
  try {
    const brut = sessionStorage.getItem(CLE_TENTATIVE)
    const enCours = brut ? (JSON.parse(brut) as { empreinte?: string; cle?: string }) : null
    if (enCours?.empreinte === empreinte && enCours.cle) return enCours.cle
    const cle = `rdv-${crypto.randomUUID()}`
    sessionStorage.setItem(CLE_TENTATIVE, JSON.stringify({ empreinte, cle }))
    return cle
  } catch {
    return `rdv-${crypto.randomUUID()}`
  }
}

export function memoriserRendezVous(reference: string, telephone: string): void {
  try {
    sessionStorage.removeItem(CLE_TENTATIVE)
    localStorage.setItem(CLE_DERNIER, JSON.stringify({ reference, telephone }))
  } catch {
    // facultatif
  }
}

export function telephoneRendezVous(reference: string): string | null {
  try {
    const brut = localStorage.getItem(CLE_DERNIER)
    if (!brut) return null
    const d = JSON.parse(brut) as { reference?: string; telephone?: string }
    return d.reference === reference && typeof d.telephone === 'string' ? d.telephone : null
  } catch {
    return null
  }
}
