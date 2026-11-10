/** Chemins de l'application. Toujours passer par ces constantes, jamais de chaînes en dur. */
export const CHEMINS = {
  accueil: '/',
  catalogue: '/catalogue',
  produits: '/produits',
  produit: (slug: string) => `/produits/${slug}`,
  perruques: '/perruques',
  perruque: (slug: string) => `/perruques/${slug}`,
  cils: '/cils',
  services: '/services',
  service: (slug: string) => `/services/${slug}`,
  rendezVous: '/rendez-vous',
  contact: '/contact',
  panier: '/panier',
  commande: '/commande',
  suiviCommande: (reference: string) => `/commande/${reference}`,
  connexion: '/connexion',
  admin: '/admin',
  systemeDesign: '/systeme-design',
  adminSystemeDesign: '/admin/systeme-design',
} as const

/** Navigation principale du site public (en-tête et menu mobile). */
export const NAVIGATION_PUBLIQUE = [
  { vers: CHEMINS.catalogue, libelle: 'Catalogue' },
  { vers: CHEMINS.perruques, libelle: 'Perruques' },
  { vers: CHEMINS.cils, libelle: 'Cils' },
  { vers: CHEMINS.services, libelle: 'Services' },
  { vers: CHEMINS.contact, libelle: 'Contact' },
] as const
