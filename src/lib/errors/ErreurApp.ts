/** Catégories d'erreurs affichables. Le message technique ne sort jamais vers la cliente. */
export type CodeErreur =
  | 'reseau'
  | 'non_connecte'
  | 'acces_refuse'
  | 'introuvable'
  | 'validation'
  | 'conflit'
  | 'stock_insuffisant'
  | 'trop_de_commandes'
  | 'transition'
  | 'validation_admin'
  | 'creneau_indisponible'
  | 'trop_de_rendez_vous'
  | 'annulation_tardive'
  | 'rdv_existants'
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
  trop_de_commandes:
    'Vous avez déjà plusieurs commandes en attente de confirmation. Notre équipe vous contacte : vous pourrez commander à nouveau ensuite.',
  transition:
    "Cette action n'est plus possible : la commande ou le rendez-vous a changé d'état. Actualisez la page.",
  validation_admin:
    'Écart important : un administrateur doit valider ce recomptage (rôle admin ou propriétaire).',
  creneau_indisponible:
    'Ce créneau vient d’être pris ou n’est plus disponible. Choisissez-en un autre.',
  trop_de_rendez_vous:
    'Vous avez déjà deux demandes de rendez-vous en attente. Notre équipe vous recontacte sur WhatsApp.',
  annulation_tardive:
    'Votre rendez-vous est trop proche pour être annulé en ligne. Prévenez-nous sur WhatsApp.',
  rdv_existants:
    'Des rendez-vous sont prévus ce jour-là : annulez-les (en prévenant les clientes) avant de fermer.',
  configuration: "L'application est mal configurée. Contactez l'équipe Glorious Destiny.",
  inconnue: 'Une erreur inattendue est survenue. Réessayez dans un instant.',
}
