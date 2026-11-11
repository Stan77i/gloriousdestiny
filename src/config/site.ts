/** Constantes de marque. Les valeurs modifiables (WhatsApp, horaires) viennent de la table `parametres`. */
export const SITE = {
  nom: 'Glorious Destiny',
  langue: 'fr',
  fuseauSalon: 'Africa/Douala',
  /** Décalage UTC du salon (Africa/Douala : UTC+1 toute l'année, sans heure d'été). */
  decalageSalon: '+01:00',
  /** Pays livrés (miroir de la table public.pays) et texte court réutilisable. */
  paysLivres: [
    'Cameroun',
    'Côte d’Ivoire',
    'Gabon',
    'Congo',
    'Sénégal',
    'Guinée',
    'Canada',
    'Royaume-Uni',
  ],
  zonesLivraison: 'Cameroun, Côte d’Ivoire, Gabon, Congo, Sénégal, Guinée, Canada et Royaume-Uni',
} as const
