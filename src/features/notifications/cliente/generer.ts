import { formaterHeure, formaterJour, jourSalon } from '@/lib/format/date'
import type { TypeCliente } from './memoire'

/**
 * Construit les notifications d'une visiteuse à partir de données réelles uniquement : l'état
 * serveur de SES commandes et rendez-vous, la disponibilité des articles qu'elle attend, les
 * produits publiés après sa première visite, son panier. Fonction pure : testable, sans réseau.
 */

export type NotifCliente = {
  cle: string
  type: TypeCliente
  titre: string
  corps: string
  lien: string
  date: string
}

export type DonneesCliente = {
  maintenant: number
  premiereVisite: string
  commandes: {
    reference: string
    statut: string
    creeLe: string
    lignes: { nom: string; quantite: number }[]
    lien: string
  }[]
  rdvs: {
    reference: string
    statut: string
    debut: string
    service: string
    motif: string | null
    lien: string
  }[]
  alertes: {
    varianteId: string
    produit: string
    disponible: boolean
    accroche: string | null
    lien: string
  }[]
  produits: { nom: string; accroche: string | null; creeLe: string; lien: string }[]
  panier: { noms: string[]; majLe: string | null; empreinte: string; lien: string }
}

function articles(lignes: { nom: string; quantite: number }[]): string {
  const [premier, ...autres] = lignes
  if (!premier) return 'vos articles'
  const base = `${premier.nom} × ${String(premier.quantite)}`
  return autres.length === 0 ? base : `${base} et ${String(autres.length)} autre(s) article(s)`
}

const MESSAGES_COMMANDE: Record<
  string,
  (c: DonneesCliente['commandes'][number]) => { titre: string; corps: string } | null
> = {
  confirmee: (c) => ({
    titre: `Commande ${c.reference} confirmée`,
    corps: `Nous préparons ${articles(c.lignes)}. Vous serez prévenue à l’envoi.`,
  }),
  expediee: (c) => ({
    titre: `Commande ${c.reference} en route`,
    corps: `${articles(c.lignes)} : votre colis est remis à l’agence de livraison.`,
  }),
  livree: (c) => ({
    titre: `Commande ${c.reference} livrée`,
    corps: `Merci pour votre confiance. Une question sur l’utilisation ? Écrivez-nous sur WhatsApp.`,
  }),
  annulee: (c) => ({
    titre: `Commande ${c.reference} annulée`,
    corps: `Cette commande n’aboutira pas. Votre panier reste disponible si vous souhaitez recommander.`,
  }),
}

export function genererNotifications(d: DonneesCliente): NotifCliente[] {
  const liste: NotifCliente[] = []
  const iso = new Date(d.maintenant).toISOString()

  for (const c of d.commandes) {
    const m = MESSAGES_COMMANDE[c.statut]?.(c)
    if (m)
      liste.push({
        cle: `commande:${c.reference}:${c.statut}`,
        type: 'commande',
        ...m,
        lien: c.lien,
        date: iso,
      })
  }

  for (const r of d.rdvs) {
    if (r.statut === 'confirme') {
      liste.push({
        cle: `rdv:${r.reference}:confirme:${r.debut}`,
        type: 'rdv',
        titre: 'Rendez-vous confirmé',
        corps: `${r.service}, ${formaterJour(jourSalon(r.debut))} à ${formaterHeure(r.debut)}. À bientôt au salon.`,
        lien: r.lien,
        date: iso,
      })
    }
    if (r.statut === 'annule') {
      liste.push({
        cle: `rdv:${r.reference}:annule`,
        type: 'rdv',
        titre: 'Rendez-vous annulé',
        corps: r.motif ?? 'Le créneau a été libéré. Vous pouvez en choisir un autre.',
        lien: r.lien,
        date: iso,
      })
    }
    const dans = new Date(r.debut).getTime() - d.maintenant
    if ((r.statut === 'confirme' || r.statut === 'demande') && dans > 0 && dans <= 24 * 3_600_000) {
      const memeJour = jourSalon(r.debut) === jourSalon(new Date(d.maintenant))
      liste.push({
        cle: `rdv:${r.reference}:rappel:${r.debut}`,
        type: 'rdv',
        titre: `${memeJour ? 'Aujourd’hui' : 'Demain'} à ${formaterHeure(r.debut)} : ${r.service}`,
        corps: 'Un empêchement ? Prévenez-nous sur WhatsApp pour libérer le créneau.',
        lien: r.lien,
        date: iso,
      })
    }
  }

  for (const a of d.alertes) {
    if (!a.disponible) continue
    liste.push({
      cle: `stock:${a.varianteId}:retour`,
      type: 'stock',
      titre: `${a.produit} est de retour`,
      corps: a.accroche
        ? `${a.accroche} Il est de nouveau disponible.`
        : 'Il est de nouveau disponible.',
      lien: a.lien,
      date: iso,
    })
  }

  for (const p of d.produits) {
    if (new Date(p.creeLe).getTime() <= new Date(d.premiereVisite).getTime()) continue
    liste.push({
      cle: `nouveaute:${p.lien}`,
      type: 'nouveaute',
      titre: `Nouveau : ${p.nom}`,
      corps: p.accroche ?? 'Découvrez-le dans le catalogue.',
      lien: p.lien,
      date: p.creeLe,
    })
  }

  const majLe = d.panier.majLe ? new Date(d.panier.majLe).getTime() : null
  if (d.panier.noms.length > 0 && majLe !== null && d.maintenant - majLe > 24 * 3_600_000) {
    const [premier, ...autres] = d.panier.noms
    liste.push({
      cle: `panier:${d.panier.empreinte}`,
      type: 'panier',
      titre: 'Votre panier vous attend',
      corps: `${premier ?? ''}${autres.length > 0 ? ` et ${String(autres.length)} autre(s) article(s)` : ''} : finalisez quand vous voulez, la commande se confirme sur WhatsApp.`,
      lien: d.panier.lien,
      date: iso,
    })
  }

  return liste
}
