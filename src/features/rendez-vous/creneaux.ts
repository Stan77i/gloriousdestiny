import { SITE } from '@/config/site'
import { decalerJour, jourSalon } from '@/lib/format/date'

export type JourCreneaux = { jour: string; creneaux: string[] }

/**
 * Répartit les créneaux (instants ISO) sur `nbJours` jours consécutifs à partir de `du`,
 * selon le jour du SALON (pas celui de l'appareil : une cliente à l'étranger voit les mêmes jours).
 * Les jours sans créneau restent présents, vides.
 */
export function regrouperParJour(
  creneaux: string[],
  du: string,
  nbJours: number,
  fuseau: string = SITE.fuseauSalon,
): JourCreneaux[] {
  const jours = Array.from({ length: nbJours }, (_, i) => ({
    jour: decalerJour(du, i),
    creneaux: [] as string[],
  }))
  const index = new Map(jours.map((j) => [j.jour, j]))
  for (const c of [...creneaux].sort()) index.get(jourSalon(c, fuseau))?.creneaux.push(c)
  return jours
}

/** Matin (avant 12 h) / après-midi, dans le fuseau du salon. */
export function moment(iso: string, fuseau: string = SITE.fuseauSalon): 'matin' | 'apres-midi' {
  const heure = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: fuseau })
      .formatToParts(new Date(iso))
      .find((p) => p.type === 'hour')?.value,
  )
  return heure < 12 ? 'matin' : 'apres-midi'
}
