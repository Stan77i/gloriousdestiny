/**
 * Univers visuel de chaque prestation (fond d'attente de la photo, accroche courte).
 * Uniquement du décor : nom, texte, prix et photo viennent de la base (table services).
 * Noir, or, ivoire, champagne, cuivre : jamais de vert ni de violet derrière une prestation.
 */
export type UniversPrestation = {
  /** Fond du cadre photo tant qu'aucune photo n'est déposée. */
  fond: string
  /** Scène sombre (texte clair) ou claire. */
  nuit: boolean
  accroche: string
}

const UNIVERS: Record<string, UniversPrestation> = {
  'pose-frontale': {
    fond: 'radial-gradient(120% 90% at 30% 20%, #fff6e2 0%, #f1d9a6 45%, #c8964a 100%)',
    nuit: false,
    accroche: 'Contours travaillés, rendu naturel',
  },
  'traitement-de-perruque': {
    fond: 'radial-gradient(120% 90% at 70% 25%, #fffdf8 0%, #f4ead6 50%, #dcc7a0 100%)',
    nuit: false,
    accroche: 'Fibres soignées, éclat retrouvé',
  },
  'coloration-de-perruque': {
    fond: 'radial-gradient(120% 90% at 35% 30%, #f6c98f 0%, #b8682f 55%, #5a2a14 100%)',
    nuit: true,
    accroche: 'Une nouvelle nuance, posée avec soin',
  },
  'montage-de-perruque': {
    fond: 'radial-gradient(120% 90% at 60% 20%, #3a3128 0%, #17140f 60%, #0b0a08 100%)',
    nuit: true,
    accroche: 'Assemblage précis, finition nette',
  },
}

const DEFAUT: UniversPrestation = {
  fond: 'radial-gradient(120% 90% at 50% 20%, #fffdf8 0%, #f1dfb8 60%, #c8964a 100%)',
  nuit: false,
  accroche: 'Savoir-faire Glorious Destiny',
}

export function universPrestation(slug: string): UniversPrestation {
  return UNIVERS[slug] ?? DEFAUT
}
