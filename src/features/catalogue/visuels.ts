import laGammePetite from '@/assets/photos/la-gamme-1000.webp'
import laGammeGrande from '@/assets/photos/la-gamme-2000.webp'
import { GAMME } from './gamme'

/**
 * Visuels fournis par le client, rattachés aux produits par leur slug.
 * - `detoure` : produit détouré posé sur un socle teinté (les 7 produits d'origine) ;
 * - `pleine` : photo de la cliente utilisée telle quelle, sans détourage, en plein cadre ;
 * - `photo` : photo d'usage (en situation), au survol et en seconde vue.
 * Un produit sans visuel local affiche un monogramme.
 */
export type PhotoPleine = { petite: string; grande: string; ratio: string; alt: string }

export type VisuelProduit = {
  detoure: string | null
  pleine: PhotoPleine | null
  photo: { petite: string; grande: string; alt: string } | null
}

/** Photos telles quelles (src/assets/photos/<slug>-<largeur>.webp), chargées par Vite. */
const FICHIERS = import.meta.glob<string>('@/assets/photos/*.webp', {
  eager: true,
  import: 'default',
})

function photosDe(slug: string): { petite: string; grande: string } | null {
  const tailles = Object.entries(FICHIERS)
    .flatMap(([chemin, url]) => {
      const m = new RegExp(`/${slug}-(\\d+)\\.webp$`).exec(chemin)
      return m ? [{ largeur: Number(m[1]), url }] : []
    })
    .sort((a, b) => a.largeur - b.largeur)
  const petite = tailles[0]
  const grande = tailles.at(-1)
  return petite && grande ? { petite: petite.url, grande: grande.url } : null
}

/** Produits ajoutés le 11/11/2026 : photos de la cliente, sans détourage. */
const PLEINES: Record<string, { ratio: string; alt: string }> = {
  'strip-lashes-fluffy-wispy': {
    ratio: '1 / 1',
    alt: 'Dix paires de faux cils dans leur plateau rose.',
  },
  'cluster-lashes-box': { ratio: '1 / 1', alt: 'Boîte rose de cils en grappes, de 30P à 100P.' },
  'fluffy-lash-clusters-12-26': {
    ratio: '1 / 1',
    alt: 'Double plateau orange ouvert, rempli de grappes de cils fluffy.',
  },
  'fluffy-lash-clusters-200d': { ratio: '1 / 1', alt: 'Plateau rose de grappes de cils 200D.' },
  'lash-extension-kit': {
    ratio: '1 / 1',
    alt: 'Kit d’extensions de cils : plateaux de grappes, pince, brosse et colle.',
  },
  'fluffy-lash-clusters-cat-eye-100d': {
    ratio: '1 / 1',
    alt: 'Plateau rose de grappes de cils cat eye.',
  },
  'fluffy-lash-clusters-80d': {
    ratio: '1 / 1',
    alt: 'Plateau rose de grappes de cils de 10 et 12 mm.',
  },
  'glue-liquid-gel': {
    ratio: '4 / 5',
    alt: 'Le flacon Glue Liquid Gel parmi les produits Glorious Destiny.',
  },
  'silkening-mist': {
    ratio: '4 / 5',
    alt: 'Le vaporisateur Silkening Mist parmi les produits Glorious Destiny.',
  },
  'hair-styling-gel': {
    ratio: '4 / 5',
    alt: 'Le pot Hair Styling Gel parmi les produits Glorious Destiny.',
  },
  'la-gamme': {
    ratio: '2000 / 1116',
    alt: 'La gamme Glorious Destiny réunie : Lace Glue, Wax Stick, Silkening Mist, Lace Melting Spray, Lace Glue Remover Spray, Hair Styling Gel et Glue Liquid Gel.',
  },
}

/** La gamme : la photo d'ensemble, pour le grand visuel d'accueil et de la page Produits. */
export const PHOTO_LA_GAMME: PhotoPleine = {
  petite: laGammePetite,
  grande: laGammeGrande,
  ratio: '2000 / 1116',
  alt: PLEINES['la-gamme']?.alt ?? 'La gamme Glorious Destiny',
}

export const SLUG_LA_GAMME = 'la-gamme'

const PAR_SLUG = new Map<string, VisuelProduit>([
  ...GAMME.map((p) => [p.slug, { detoure: p.detoure, pleine: null, photo: p.photo }] as const),
  ...Object.entries(PLEINES).flatMap(([slug, info]) => {
    const f = photosDe(slug)
    return f ? [[slug, { detoure: null, pleine: { ...f, ...info }, photo: null }] as const] : []
  }),
])

export function visuelProduit(slug: string): VisuelProduit {
  return PAR_SLUG.get(slug) ?? { detoure: null, pleine: null, photo: null }
}
