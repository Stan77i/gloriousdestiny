/**
 * Univers visuel de chaque prestation (fond d'attente de la photo, accroche courte).
 * Uniquement du décor : nom, texte, prix et photo viennent de la base (table services).
 * Noir, or, ivoire, champagne, cuivre : jamais de vert ni de violet derrière une prestation.
 */
export type UniversPrestation = {
  /** Fond de l'illustration tant qu'aucune photo n'est déposée. */
  fond: string
  /** Scène sombre (texte clair) ou claire. */
  nuit: boolean
  accroche: string
}

const UNIVERS: Record<string, UniversPrestation> = {
  'pose-frontale': {
    fond: 'radial-gradient(110% 80% at 50% 30%, #2a241d 0%, #17140f 55%, #0b0a08 100%)',
    nuit: true,
    accroche: 'Contours travaillés, rendu naturel',
  },
  'traitement-de-perruque': {
    fond: 'radial-gradient(110% 80% at 50% 30%, #fffdf8 0%, #f7efe0 60%, #ecdfc6 100%)',
    nuit: false,
    accroche: 'Fibres soignées, éclat retrouvé',
  },
  'coloration-de-perruque': {
    fond: 'radial-gradient(110% 80% at 50% 30%, #fffaf1 0%, #f6e6cc 60%, #ebd3ab 100%)',
    nuit: false,
    accroche: 'Une nouvelle nuance, posée avec soin',
  },
  'ventilation-frontale-perruque': {
    fond: 'radial-gradient(110% 80% at 50% 30%, #fffdf8 0%, #f6ecdb 60%, #e9d9bd 100%)',
    nuit: false,
    accroche: 'Votre frontale revit, prête à porter',
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
