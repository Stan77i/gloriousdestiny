/**
 * Mémoire locale des notifications d'une visiteuse (sans compte) : uniquement ce qu'elle a fait
 * sur cet appareil (commandes, rendez-vous, demandes « prévenez-moi »), ce qu'elle a déjà lu et
 * les types qu'elle a coupés. Rien n'est envoyé ailleurs ; « Tout oublier » efface tout.
 */
export const TYPES_CLIENTE = ['commande', 'rdv', 'stock', 'nouveaute', 'panier'] as const
export type TypeCliente = (typeof TYPES_CLIENTE)[number]

export type Suivi = {
  type: 'commande' | 'rdv'
  reference: string
  telephone: string
  ajouteLe: string
}
export type AlerteSuivie = { varianteId: string; produit: string; slug: string; ajouteLe: string }

export type EtatCliente = {
  suivis: Suivi[]
  alertes: AlerteSuivie[]
  lues: string[]
  coupes: TypeCliente[]
  premiereVisite: string
}

const CLE = 'gd-notifications-cliente'
const DUREE_SUIVI_JOURS = 120

function vide(): EtatCliente {
  return { suivis: [], alertes: [], lues: [], coupes: [], premiereVisite: new Date().toISOString() }
}

export function lireEtat(): EtatCliente {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) {
      const e = vide()
      localStorage.setItem(CLE, JSON.stringify(e))
      return e
    }
    const e = { ...vide(), ...(JSON.parse(brut) as Partial<EtatCliente>) }
    const limite = Date.now() - DUREE_SUIVI_JOURS * 86_400_000
    return {
      ...e,
      suivis: e.suivis.filter((s) => new Date(s.ajouteLe).getTime() > limite).slice(-10),
      alertes: e.alertes.slice(-10),
      lues: e.lues.slice(-200),
    }
  } catch {
    return vide()
  }
}

function ecrire(e: EtatCliente): EtatCliente {
  try {
    localStorage.setItem(CLE, JSON.stringify(e))
    window.dispatchEvent(new Event('gd-notifications-cliente'))
  } catch {
    // stockage indisponible : les notifications valent pour cette visite
  }
  return e
}

export function suivre(type: Suivi['type'], reference: string, telephone: string): void {
  const e = lireEtat()
  const suivis = e.suivis.filter((s) => !(s.type === type && s.reference === reference))
  ecrire({
    ...e,
    suivis: [...suivis, { type, reference, telephone, ajouteLe: new Date().toISOString() }],
  })
}

export function suivreAlerte(a: Omit<AlerteSuivie, 'ajouteLe'>): void {
  const e = lireEtat()
  const alertes = e.alertes.filter((x) => x.varianteId !== a.varianteId)
  ecrire({ ...e, alertes: [...alertes, { ...a, ajouteLe: new Date().toISOString() }] })
}

export function marquerLues(cles: string[]): void {
  const e = lireEtat()
  const lues = Array.from(new Set([...e.lues, ...cles]))
  // Une alerte de retour en stock lue est terminée : on cesse de la surveiller.
  const servies = new Set(cles.filter((c) => c.startsWith('stock:')).map((c) => c.split(':')[1]))
  ecrire({ ...e, lues, alertes: e.alertes.filter((a) => !servies.has(a.varianteId)) })
}

export function basculerType(type: TypeCliente, actif: boolean): void {
  const e = lireEtat()
  const coupes = actif
    ? e.coupes.filter((t) => t !== type)
    : Array.from(new Set([...e.coupes, type]))
  ecrire({ ...e, coupes })
}

export function toutOublier(): void {
  ecrire({ ...vide(), premiereVisite: lireEtat().premiereVisite })
}
