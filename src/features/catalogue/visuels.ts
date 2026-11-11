import clusterLashesBox from '@/assets/produits/cluster-lashes-box.webp'
import flc1226 from '@/assets/produits/fluffy-lash-clusters-12-26.webp'
import flc200d from '@/assets/produits/fluffy-lash-clusters-200d.webp'
import flc80d from '@/assets/produits/fluffy-lash-clusters-80d.webp'
import flcCatEye from '@/assets/produits/fluffy-lash-clusters-cat-eye-100d.webp'
import laGamme from '@/assets/produits/gamme.webp'
import glueLiquidGel from '@/assets/produits/glue-liquid-gel.webp'
import hairStylingGel from '@/assets/produits/hair-styling-gel.webp'
import lashExtensionKit from '@/assets/produits/lash-extension-kit.webp'
import silkeningMist from '@/assets/produits/silkening-mist.webp'
import stripLashes from '@/assets/produits/strip-lashes.webp'
import { GAMME } from './gamme'

/**
 * Visuels fournis par le client, rattachés aux produits par leur slug.
 * Provisoire : en Phase 10, les images seront gérées depuis l'administration (Supabase Storage).
 * Un produit ajouté plus tard sans visuel local affiche un monogramme.
 */
export type VisuelProduit = {
  detoure: string | null
  photo: { petite: string; grande: string; alt: string } | null
}

/** Produits ajoutés le 11/11/2026 : photos de la cliente, détourées (BiRefNet). */
const AJOUTS: Record<string, string> = {
  'strip-lashes-fluffy-wispy': stripLashes,
  'cluster-lashes-box': clusterLashesBox,
  'fluffy-lash-clusters-12-26': flc1226,
  'fluffy-lash-clusters-200d': flc200d,
  'lash-extension-kit': lashExtensionKit,
  'fluffy-lash-clusters-cat-eye-100d': flcCatEye,
  'fluffy-lash-clusters-80d': flc80d,
  'glue-liquid-gel': glueLiquidGel,
  'hair-styling-gel': hairStylingGel,
  'silkening-mist': silkeningMist,
  'la-gamme': laGamme,
}

const PAR_SLUG = new Map<string, VisuelProduit>([
  ...GAMME.map((p) => [p.slug, { detoure: p.detoure, photo: p.photo }] as const),
  ...Object.entries(AJOUTS).map(([slug, detoure]) => [slug, { detoure, photo: null }] as const),
])

export function visuelProduit(slug: string): VisuelProduit {
  return PAR_SLUG.get(slug) ?? { detoure: null, photo: null }
}
