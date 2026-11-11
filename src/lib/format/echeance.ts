import { SITE } from '@/config/site'

/** Jour calendaire (AAAA-MM-JJ) à l'heure du salon. */
function jourSalon(t: number): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: SITE.fuseauSalon }).format(new Date(t))
}

/**
 * Mention d'échéance d'une offre, à partir de sa vraie date de fin :
 * « jusqu'à ce soir », « jusqu'à demain », « jusqu'à lundi », sinon « jusqu'au 30 nov. ».
 * Null si l'offre n'a pas de fin ou est déjà terminée.
 */
export function echeance(fin: string | null, maintenant: number): string | null {
  if (!fin) return null
  const f = new Date(fin).getTime()
  if (f <= maintenant) return null
  const jourFin = jourSalon(f)
  if (jourFin === jourSalon(maintenant)) return 'jusqu’à ce soir'
  if (jourFin === jourSalon(maintenant + 86_400_000)) return 'jusqu’à demain'
  // Moins d'une semaine : le jour suffit (jamais ambigu, la même journée la semaine suivante est exclue).
  if (f - maintenant < 7 * 86_400_000) {
    const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: SITE.fuseauSalon, weekday: 'long' })
      .format(new Date(f))
      .toLowerCase()
    return `jusqu’à ${jour}`
  }
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: SITE.fuseauSalon,
    day: 'numeric',
    month: 'short',
  }).format(new Date(f))
  return `jusqu’au ${date}`
}

/** Temps restant découpé (jours, heures, minutes, secondes), jamais négatif. */
export function restant(fin: string, maintenant: number) {
  const s = Math.max(0, Math.floor((new Date(fin).getTime() - maintenant) / 1000))
  return {
    total: s,
    jours: Math.floor(s / 86_400),
    heures: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    secondes: s % 60,
  }
}
