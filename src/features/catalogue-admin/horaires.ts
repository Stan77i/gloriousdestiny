/** Jours dans l'ordre de la semaine française (lundi d'abord) ; 0 = dimanche comme en base. */
export const JOURS_SEMAINE = [
  { jour: 1, nom: 'lundi' },
  { jour: 2, nom: 'mardi' },
  { jour: 3, nom: 'mercredi' },
  { jour: 4, nom: 'jeudi' },
  { jour: 5, nom: 'vendredi' },
  { jour: 6, nom: 'samedi' },
  { jour: 0, nom: 'dimanche' },
] as const

export type JourHoraire = { jourSemaine: number; ouvert: boolean; debut: string; fin: string }

/** « 09:00 » → « 9 h », « 09:30 » → « 9 h 30 ». */
export function heureLisible(hhmm: string): string {
  const [h = '0', m = '00'] = hhmm.split(':')
  return m === '00' ? `${String(Number(h))} h` : `${String(Number(h))} h ${m}`
}

/** Vérifie une plage : format HH:MM et fin après le début. */
export function plageValide(debut: string, fin: string): boolean {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/
  return re.test(debut) && re.test(fin) && fin > debut
}

/**
 * Texte public des horaires, en regroupant les jours consécutifs aux mêmes heures :
 * « Du lundi au vendredi, de 9 h à 18 h ; le samedi, de 10 h à 16 h ».
 */
export function resumerHoraires(jours: JourHoraire[]): string {
  const parJour = new Map(jours.map((j) => [j.jourSemaine, j]))
  const groupes: { noms: string[]; debut: string; fin: string }[] = []
  let precedent: (typeof groupes)[number] | null = null
  for (const { jour, nom } of JOURS_SEMAINE) {
    const j = parJour.get(jour)
    if (!j?.ouvert) {
      precedent = null
      continue
    }
    if (precedent && precedent.debut === j.debut && precedent.fin === j.fin) {
      precedent.noms.push(nom)
    } else {
      precedent = { noms: [nom], debut: j.debut, fin: j.fin }
      groupes.push(precedent)
    }
  }
  if (groupes.length === 0) return 'Salon fermé pour le moment'
  const texte = groupes
    .map((g) => {
      const jours =
        g.noms.length === 1
          ? `le ${g.noms[0] ?? ''}`
          : g.noms.length === 2
            ? `le ${g.noms[0] ?? ''} et le ${g.noms[1] ?? ''}`
            : `du ${g.noms[0] ?? ''} au ${g.noms[g.noms.length - 1] ?? ''}`
      return `${jours}, de ${heureLisible(g.debut)} à ${heureLisible(g.fin)}`
    })
    .join(' ; ')
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
