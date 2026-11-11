import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/**
 * Analyse et prévisions (architecture, section J). Calculées par la fonction SQL
 * public.analyse_produits (supabase/migrations/20261111230000_analyse.sql), où chaque règle est
 * écrite. Rien n'est estimé dans le navigateur.
 */

const entier = z.number().int()

export const CLASSES = [
  'epuise',
  'risque_rupture',
  'populaire',
  'en_croissance',
  'en_baisse',
  'dormant',
] as const
export type Classe = (typeof CLASSES)[number]

const schemaPoint = z.object({ debut: z.string(), ca_fcfa: entier, ventes: entier, unites: entier })

const schemaAnalyse = z.object({
  calcule_at: z.string(),
  aujourdhui: z.string(),
  regles: z.object({
    fenetre_jours: entier,
    tendance_jours: entier,
    seuil_tendance_pct: entier,
    dormant_jours: entier,
    min_ventes: entier,
    min_historique_jours: entier,
    part_populaire_pct: entier,
  }),
  produits: z.array(
    z.object({
      variante_id: z.uuid(),
      produit: z.string(),
      variante: z.string(),
      publie: z.boolean(),
      disponible: entier,
      historique_jours: entier,
      derniere_vente: z.string().nullable(),
      ventes_fenetre: entier,
      nb_ventes_fenetre: entier,
      jours_dispo_fenetre: entier,
      suffisant: z.boolean(),
      vitesse: z.number().nullable(),
      jours_avant_rupture: entier.nullable(),
      date_rupture: z.string().nullable(),
      delai_appro_jours: entier.nullable(),
      stock_securite_jours: entier.nullable(),
      quantite_recommandee: entier.nullable(),
      tendance_pct: entier.nullable(),
      cout_unitaire_fcfa: entier.nullable(),
      part_pct: entier.nullable(),
      classes: z.array(z.enum(CLASSES)),
    }),
  ),
  hebdomadaire: z.array(schemaPoint),
  mensuel: z.array(schemaPoint),
})

export type Analyse = z.infer<typeof schemaAnalyse>
export type LigneAnalyse = Analyse['produits'][number]

export function lireAnalyse(data: unknown): Analyse {
  const r = schemaAnalyse.safeParse(data)
  if (!r.success) throw versErreurApp(new Error(`Réponse inattendue : ${r.error.message}`))
  return r.data
}

export async function chargerAnalyse(): Promise<Analyse> {
  const { data, error } = await supabase().rpc('analyse_produits')
  if (error) throw versErreurApp(error)
  return lireAnalyse(data)
}
