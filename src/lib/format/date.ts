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

/** Jour calendaire (AAAA-MM-JJ) d'un instant, dans le fuseau du salon. */
export function jourSalon(instant: Date | string, fuseau: string = SITE.fuseauSalon): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuseau,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
}

/** Décale un jour calendaire AAAA-MM-JJ de n jours (sans fuseau : arithmétique de calendrier). */
export function decalerJour(jour: string, n: number): string {
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (j ?? 1) + n))
  return d.toISOString().slice(0, 10)
}

/** « 10:30 » dans le fuseau du salon. */
export function formaterHeure(iso: string, fuseau: string = SITE.fuseauSalon): string {
  return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short', timeZone: fuseau }).format(
    new Date(iso),
  )
}

/** Jour calendaire lisible : « mardi 12 novembre » (format `court` : « mar. 12 nov. »). */
export function formaterJour(jour: string, format: 'long' | 'court' = 'long'): string {
  // Midi UTC : le jour reste le même quel que soit le fuseau d'affichage.
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: format === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    timeZone: 'UTC',
  }).format(new Date(`${jour}T12:00:00Z`))
}

/** Instant ISO de minuit (heure du salon) pour un jour calendaire AAAA-MM-JJ. */
export function minuitSalon(jour: string): string {
  return new Date(`${jour}T00:00:00${SITE.decalageSalon}`).toISOString()
}

/** Instant ISO d'une heure « HH:MM » d'un jour AAAA-MM-JJ, à l'heure du salon. */
export function instantSalon(jour: string, heure: string): string {
  return new Date(`${jour}T${heure}:00${SITE.decalageSalon}`).toISOString()
}

/** Lundi (AAAA-MM-JJ) de la semaine du jour donné. */
export function lundiDe(jour: string): string {
  const jourSemaine = new Date(`${jour}T12:00:00Z`).getUTCDay() // 0 = dimanche
  return decalerJour(jour, jourSemaine === 0 ? -6 : 1 - jourSemaine)
}

/** Première lettre en majuscule (« mardi 12 novembre » → « Mardi 12 novembre »). */
export function initiale(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
