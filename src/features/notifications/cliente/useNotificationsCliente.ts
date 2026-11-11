import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { CHEMINS } from '@/app/router/chemins'
import { useDisponibilites, useProduits } from '@/features/catalogue/requetes'
import { lienProduit } from '@/features/catalogue/liens'
import { CLE_PANIER_MAJ } from '@/features/panier/panier'
import { usePanier } from '@/features/panier/usePanier'
import { empreintePanier } from '@/features/commande/cleCommande'
import { useMaintenant } from '@/hooks/useMaintenant'
import { suivreCommande } from '@/services/commandes.service'
import { suivreRendezVous } from '@/services/rendezvous.service'
import { afficherAlerteNavigateur } from '../navigateur'
import { genererNotifications, type NotifCliente } from './generer'
import { lireEtat, type EtatCliente } from './memoire'

const CLE_ANNONCEES = 'gd-notifications-annoncees'

function lirePanierMaj(): string | null {
  try {
    return localStorage.getItem(CLE_PANIER_MAJ)
  } catch {
    return null
  }
}

/** État local, relu quand il change (cet onglet ou un autre). */
function useEtatCliente(): EtatCliente {
  const [etat, setEtat] = useState(lireEtat)
  useEffect(() => {
    const relire = () => {
      setEtat(lireEtat())
    }
    window.addEventListener('gd-notifications-cliente', relire)
    window.addEventListener('storage', relire)
    return () => {
      window.removeEventListener('gd-notifications-cliente', relire)
      window.removeEventListener('storage', relire)
    }
  }, [])
  return etat
}

/**
 * Notifications d'une visiteuse : statut réel de ses commandes et rendez-vous (relus toutes les
 * 5 minutes), retours en stock attendus, nouveautés publiées depuis sa première visite, panier.
 */
export function useNotificationsCliente() {
  const etat = useEtatCliente()
  const maintenant = useMaintenant(5 * 60_000)
  const produits = useProduits()
  const { lignes } = usePanier()

  const commandes = useQueries({
    queries: etat.suivis
      .filter((s) => s.type === 'commande')
      .map((s) => ({
        queryKey: ['notif-cliente', 'commande', s.reference, s.telephone],
        queryFn: () => suivreCommande(s.reference, s.telephone),
        refetchInterval: 5 * 60_000,
        staleTime: 60_000,
      })),
  })
  const rdvs = useQueries({
    queries: etat.suivis
      .filter((s) => s.type === 'rdv')
      .map((s) => ({
        queryKey: ['notif-cliente', 'rdv', s.reference, s.telephone],
        queryFn: () => suivreRendezVous(s.reference, s.telephone),
        refetchInterval: 5 * 60_000,
        staleTime: 60_000,
      })),
  })
  const dispo = useDisponibilites(etat.alertes.map((a) => a.varianteId))

  const toutes = useMemo<NotifCliente[]>(() => {
    const parVariante = new Map(
      (produits.data ?? []).flatMap((p) => p.variantes.map((v) => [v.id, p] as const)),
    )
    const nomsPanier = lignes
      .map((l) => parVariante.get(l.varianteId)?.nom)
      .filter((n): n is string => Boolean(n))
    return genererNotifications({
      maintenant,
      premiereVisite: etat.premiereVisite,
      commandes: commandes
        .map((q) => q.data)
        .filter((c) => c !== undefined && c !== null)
        .map((c) => ({
          reference: c.reference,
          statut: c.statut,
          creeLe: c.created_at,
          lignes: c.lignes.map((l) => ({ nom: l.nom, quantite: l.quantite })),
          lien: CHEMINS.suiviCommande(c.reference),
        })),
      rdvs: rdvs
        .map((q) => q.data)
        .filter((r) => r !== undefined && r !== null)
        .map((r) => ({
          reference: r.reference,
          statut: r.statut,
          debut: r.debut,
          service: r.service.nom,
          motif: r.motif_annulation,
          lien: CHEMINS.suiviRendezVous(r.reference),
        })),
      alertes: etat.alertes.map((a) => {
        const p = parVariante.get(a.varianteId)
        const statut = dispo.data?.get(a.varianteId)
        return {
          varianteId: a.varianteId,
          produit: a.produit,
          disponible: statut === 'disponible' || statut === 'bientot_epuise',
          accroche: p?.fiche.accroche ?? null,
          lien: p ? lienProduit(p) : CHEMINS.produit(a.slug),
        }
      }),
      produits: (produits.data ?? []).map((p) => ({
        nom: p.nom,
        accroche: p.fiche.accroche ?? null,
        creeLe: p.creeLe,
        lien: lienProduit(p),
      })),
      panier: {
        noms: nomsPanier,
        majLe: lirePanierMaj(),
        empreinte: empreintePanier(lignes),
        lien: CHEMINS.panier,
      },
    }).filter((n) => !etat.coupes.includes(n.type))
  }, [commandes, rdvs, dispo.data, produits.data, lignes, etat, maintenant])

  const nonLues = toutes.filter((n) => !etat.lues.includes(n.cle))

  // Alerte du navigateur (si la visiteuse l'a autorisée) : une seule fois par notification,
  // deux au plus par visite, jamais la nuit.
  const parVisite = useRef(0)
  useEffect(() => {
    if (parVisite.current >= 2) return
    let deja: string[] = []
    try {
      deja = JSON.parse(localStorage.getItem(CLE_ANNONCEES) ?? '[]') as string[]
    } catch {
      return
    }
    const nouvelles = nonLues.filter((n) => !deja.includes(n.cle)).slice(0, 2 - parVisite.current)
    if (nouvelles.length === 0) return
    for (const n of nouvelles) afficherAlerteNavigateur(n.titre, n.corps)
    try {
      localStorage.setItem(
        CLE_ANNONCEES,
        JSON.stringify([...deja, ...nouvelles.map((n) => n.cle)].slice(-200)),
      )
    } catch {
      // sans stockage, on n'insiste pas
    }
    parVisite.current += nouvelles.length
  }, [nonLues])

  return { toutes, nonLues, etat }
}
