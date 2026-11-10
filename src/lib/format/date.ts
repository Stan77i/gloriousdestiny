import { SITE } from '@/config/site'

/** Date et heure affichées dans le fuseau donné (salon par défaut : Africa/Douala). */
export function formaterDateHeure(iso: string, fuseau: string = SITE.fuseauSalon): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: fuseau,
  }).format(new Date(iso))
}

export function formaterDate(iso: string, fuseau: string = SITE.fuseauSalon): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: fuseau }).format(
    new Date(iso),
  )
}
