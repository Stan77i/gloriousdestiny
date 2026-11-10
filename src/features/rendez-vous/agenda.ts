/**
 * Fichier agenda (.ics, RFC 5545) d'un rendez-vous : la cliente l'ajoute à son téléphone
 * en un geste (Google Agenda, Calendrier iOS). Heures en UTC : chaque appareil les affiche
 * dans son propre fuseau.
 */
const instantIcs = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

const echapper = (texte: string) =>
  texte
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`)

export function fichierAgenda(r: {
  reference: string
  debut: string
  fin: string
  prestation: string
  lieu: string | null
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Glorious Destiny//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${r.reference}@glorious-destiny`,
    `DTSTAMP:${instantIcs(new Date().toISOString())}`,
    `DTSTART:${instantIcs(r.debut)}`,
    `DTEND:${instantIcs(r.fin)}`,
    `SUMMARY:${echapper(`${r.prestation} · Glorious Destiny`)}`,
    `DESCRIPTION:${echapper(`Rendez-vous ${r.reference} au salon Glorious Destiny.`)}`,
    ...(r.lieu ? [`LOCATION:${echapper(r.lieu)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${echapper(`${r.prestation} dans 2 heures`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
