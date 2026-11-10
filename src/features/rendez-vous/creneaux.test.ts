import { decalerJour, formaterHeure, jourSalon } from '@/lib/format/date'
import { moment, regrouperParJour } from './creneaux'

describe('créneaux de rendez-vous', () => {
  it('décale un jour calendaire, y compris en fin de mois', () => {
    expect(decalerJour('2026-11-30', 1)).toBe('2026-12-01')
    expect(decalerJour('2026-12-31', 1)).toBe('2027-01-01')
  })

  it("range un créneau selon le jour du salon, pas celui de l'appareil", () => {
    // 23 h 30 UTC = 0 h 30 à Douala (UTC+1) : c'est déjà le lendemain au salon.
    expect(jourSalon('2026-11-16T23:30:00Z')).toBe('2026-11-17')
    expect(formaterHeure('2026-11-17T08:00:00Z')).toBe('09:00')
  })

  it('garde les jours vides et trie les heures', () => {
    const jours = regrouperParJour(
      ['2026-11-17T13:00:00Z', '2026-11-17T08:00:00Z', '2026-11-19T08:00:00Z'],
      '2026-11-17',
      3,
    )
    expect(jours.map((j) => j.creneaux.length)).toEqual([2, 0, 1])
    expect(jours[0]?.creneaux[0]).toBe('2026-11-17T08:00:00Z')
  })

  it('sépare matin et après-midi à midi, heure du salon', () => {
    expect(moment('2026-11-17T10:30:00Z')).toBe('matin') // 11 h 30 à Douala
    expect(moment('2026-11-17T11:00:00Z')).toBe('apres-midi') // 12 h 00 à Douala
  })
})

describe('semaine du salon', () => {
  it('trouve le lundi et minuit heure de Douala', async () => {
    const { lundiDe, minuitSalon } = await import('@/lib/format/date')
    expect(lundiDe('2026-11-15')).toBe('2026-11-09') // dimanche → lundi précédent
    expect(lundiDe('2026-11-09')).toBe('2026-11-09')
    expect(minuitSalon('2026-11-17')).toBe('2026-11-16T23:00:00.000Z')
  })
})
