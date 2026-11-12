/** Chemins de l'application. Toujours passer par ces constantes, jamais de chaînes en dur. */
export const CHEMINS = {
  accueil: '/',
  catalogue: '/catalogue',
  produits: '/produits',
  produit: (slug: string) => `/produits/${slug}`,
  perruques: '/perruques',
  perruque: (slug: string) => `/perruques/${slug}`,
  cils: '/cils',
  prestations: '/prestations',
  prestation: (slug: string) => `/prestations/${slug}`,
  services: '/services',
  rendezVous: '/rendez-vous',
  suiviRendezVous: (reference: string) => `/rendez-vous/${reference}`,
  contact: '/contact',
  presence: '/presence',
  panier: '/panier',
  commande: '/commande',
  suiviCommande: (reference: string) => `/commande/${reference}`,
  connexion: '/connexion',
  compte: '/compte',
  suivi: '/suivi',
  admin: '/admin',
  systemeDesign: '/systeme-design',
  adminSystemeDesign: '/admin/systeme-design',
} as const

/** Navigation principale du site public (en-tête et menu mobile). */
export const NAVIGATION_PUBLIQUE = [
  { vers: CHEMINS.catalogue, libelle: 'Boutique' },
  { vers: CHEMINS.perruques, libelle: 'Perruques' },
  { vers: CHEMINS.cils, libelle: 'Cils' },
  { vers: CHEMINS.prestations, libelle: 'Prestations' },
  { vers: CHEMINS.presence, libelle: 'Dans le monde' },
  { vers: CHEMINS.contact, libelle: 'Contact' },
] as const
