import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Activité géographique réelle (supabase/migrations/20261112120000_carte.sql) : par pays, par
 * ville et par quartier, sur une période. Coordonnées des villes en base ; aucun chiffre estimé.
 */

const entier = z.number().int()
const coordonnee = z.coerce.number()

const schemaVille = z.object({
  id: entier,
  nom: z.string(),
  pays: z.string(),
  devise: z.string(),
  latitude: coordonnee.nullable(),
  longitude: coordonnee.nullable(),
  commandes: entier,
  livrees: entier,
  en_cours: entier,
  a_confirmer: entier,
  annulees: entier,
  ca_fcfa: entier,
  ventes: entier,
  panier_moyen_fcfa: entier.nullable(),
  clientes: entier,
  derniere_commande_at: z.string().nullable(),
  produit_phare: z.object({ nom: z.string(), quantite: entier }).nullable(),
  quartiers: z.array(z.object({ quartier: z.string(), commandes: entier })),
})
export type VilleCarte = z.infer<typeof schemaVille>

const schemaCarte = z.object({
  du: z.string(),
  au: z.string(),
  salon: z
    .object({
      ville: z.string(),
      latitude: coordonnee.nullable(),
      longitude: coordonnee.nullable(),
      rendez_vous: entier,
    })
    .nullable(),
  pays: z.array(
    z.object({
      code: z.string(),
      nom: z.string(),
      commandes: entier,
      ca_fcfa: entier,
      villes: entier,
    }),
  ),
  villes: z.array(schemaVille),
})
export type Carte = z.infer<typeof schemaCarte>

export async function chargerCarte(du: string, au: string): Promise<Carte> {
  const { data, error } = await supabase().rpc('carte_activite', { p_du: du, p_au: au })
  if (error) throw versErreurApp(error)
  const r = schemaCarte.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}

/**
 * Carte publique (supabase/migrations/20261112150000_carte_publique.sql) : comptes agrégés par
 * pays et ville desservie, depuis l'ouverture. Trois états distincts : enregistrées (une
 * commande n'est pas une livraison), en route (remises au transporteur), livrées (remises à la
 * cliente). Aucun nom, téléphone, adresse, quartier ni montant.
 */
const comptesPublics = {
  enregistrees: entier,
  en_route: entier,
  livrees: entier,
}
const schemaVillePublique = z.object({
  id: entier,
  nom: z.string(),
  pays: z.string(),
  latitude: coordonnee.nullable(),
  longitude: coordonnee.nullable(),
  ...comptesPublics,
})
export type VillePublique = z.infer<typeof schemaVillePublique>

const schemaCartePublique = z.object({
  salon: z
    .object({
      ville: z.string(),
      pays: z.string(),
      latitude: coordonnee.nullable(),
      longitude: coordonnee.nullable(),
    })
    .nullable(),
  pays: z.array(z.object({ code: z.string(), nom: z.string(), villes: entier, ...comptesPublics })),
  villes: z.array(schemaVillePublique),
})
export type CartePublique = z.infer<typeof schemaCartePublique>

export async function chargerCartePublique(): Promise<CartePublique> {
  const { data, error } = await supabase().rpc('carte_publique')
  if (error) throw versErreurApp(error)
  const r = schemaCartePublique.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}
