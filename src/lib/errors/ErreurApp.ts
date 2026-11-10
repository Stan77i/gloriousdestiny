/** Catégories d'erreurs affichables. Le message technique ne sort jamais vers la cliente. */
export type CodeErreur =
  | 'reseau'
  | 'non_connecte'
  | 'acces_refuse'
  | 'introuvable'
  | 'validation'
  | 'conflit'
  | 'stock_insuffisant'
  | 'configuration'
  | 'inconnue'

export class ErreurApp extends Error {
  override name = 'ErreurApp'
  readonly code: CodeErreur
  /** Détail technique, réservé aux journaux. */
  readonly detail: string | undefined

  constructor(code: CodeErreur, detail?: string, options?: { cause?: unknown }) {
    super(MESSAGES[code], options)
    this.code = code
    this.detail = detail
  }
}

export const MESSAGES: Record<CodeErreur, string> = {
  reseau: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
  non_connecte: 'Votre session a expiré. Reconnectez-vous.',
  acces_refuse: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  introuvable: "L'élément demandé est introuvable.",
  validation: 'Certaines informations sont invalides. Vérifiez le formulaire.',
  conflit: 'Cette opération a déjà été enregistrée ou entre en conflit avec une autre.',
  stock_insuffisant: "Stock insuffisant pour l'un des articles.",
  configuration: "L'application est mal configurée. Contactez l'équipe Glorious Destiny.",
  inconnue: 'Une erreur inattendue est survenue. Réessayez dans un instant.',
}
