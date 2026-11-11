import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Tableau de bord (architecture, section D1). Tous les chiffres sont calculés par la fonction SQL
 * public.tableau_de_bord (supabase/migrations/20261111220000_tableau_de_bord.sql), où chaque
 * définition est écrite. Le navigateur ne fait qu'afficher.
 */

const entier = z.number().int()

const schemaPoint = z.object({ debut: z.string(), ca_fcfa: entier, nombre: entier })
export type PointPouls = z.infer<typeof schemaPoint>

const schemaTableau = z.object({
  du: z.string(),
  au: z.string(),
  precedente: z.object({ du: z.string(), au: z.string() }),
  ventes: z.object({
    ca_fcfa: entier,
    nombre: entier,
    panier_moyen_fcfa: entier.nullable(),
    ca_precedent_fcfa: entier,
    nombre_precedent: entier,
    encaisse_fcfa: entier,
    a_encaisser_fcfa: entier,
  }),
  serie: z.array(z.object({ jour: z.string(), ca_fcfa: entier, nombre: entier })),
  pouls: z.object({
    jours: z.array(schemaPoint),
    semaines: z.array(schemaPoint),
    mois: z.array(schemaPoint),
  }),
  commandes_par_statut: z.record(z.string(), entier),
  par_ville: z.array(z.object({ ville: z.string(), nombre: entier, ca_fcfa: entier })),
  produits: z.array(
    z.object({
      variante_id: z.uuid(),
      produit: z.string(),
      variante: z.string(),
      quantite: entier,
      ca_fcfa: entier,
    }),
  ),
  clientes: z.object({
    actives: entier,
    nouvelles: entier,
    recurrentes: entier,
    meilleures: z.array(
      z.object({ id: z.uuid(), nom: z.string(), nombre: entier, ca_fcfa: entier }),
    ),
  }),
  alertes: z.object({
    seuil_heures: entier,
    commandes_en_attente: z.array(
      z.object({
        id: z.uuid(),
        reference: z.string(),
        cliente: z.string(),
        created_at: z.string(),
        reservation_expire_at: z.string().nullable(),
      }),
    ),
    expirations_proches: entier,
    a_expedier: entier,
    en_cours_de_livraison: entier,
  }),
  stock: z.object({
    articles: entier,
    epuises: entier,
    bientot_epuises: entier,
    unites_disponibles: entier,
    valeur_fcfa: entier.nullable(),
    articles_sans_cout: entier,
  }),
  rendez_vous: z.object({
    aujourdhui: entier,
    sept_jours: entier,
    a_confirmer: entier,
    periode_confirmes: entier,
    periode_demandes: entier,
    liste_jour: z.array(
      z.object({
        id: z.uuid(),
        reference: z.string(),
        debut: z.string(),
        fin: z.string(),
        statut: z.enum(['demande', 'confirme', 'termine', 'absent']),
        service: z.string(),
        cliente: z.string(),
      }),
    ),
    periode_termines: entier,
    periode_absentes: entier,
    periode_ca_fcfa: entier,
  }),
})

export type TableauDeBord = z.infer<typeof schemaTableau>

export function lireTableau(data: unknown): TableauDeBord {
  const r = schemaTableau.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}

/** Indicateurs de la période [du, au] (jours calendaires du salon, bornes incluses). */
export async function chargerTableauDeBord(du: string, au: string): Promise<TableauDeBord> {
  const { data, error } = await supabase().rpc('tableau_de_bord', { p_du: du, p_au: au })
  if (error) throw versErreurApp(error)
  return lireTableau(data)
}
