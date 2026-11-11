import { describe, expect, it } from 'vitest'
import { echeance, restant } from './echeance'

// Mardi 10 novembre 2026, 10:00 à Douala (UTC+1).
const MAINTENANT = new Date('2026-11-10T09:00:00Z').getTime()

describe('échéance d’une offre', () => {
  it('nomme la fin réelle', () => {
    expect(echeance('2026-11-10T21:00:00Z', MAINTENANT)).toBe('jusqu’à ce soir')
    expect(echeance('2026-11-11T20:00:00Z', MAINTENANT)).toBe('jusqu’à demain')
    expect(echeance('2026-11-16T10:00:00Z', MAINTENANT)).toBe('jusqu’à lundi')
    expect(echeance('2026-11-30T10:00:00Z', MAINTENANT)).toBe('jusqu’au 30 nov.')
  })
  it('ne montre rien sans fin ou après la fin', () => {
    expect(echeance(null, MAINTENANT)).toBeNull()
    expect(echeance('2026-11-10T08:59:59Z', MAINTENANT)).toBeNull()
  })
  it('découpe le temps restant sans jamais repartir', () => {
    expect(restant('2026-11-12T23:35:20Z', MAINTENANT)).toEqual({
      total: 2 * 86_400 + 14 * 3600 + 35 * 60 + 20,
      jours: 2,
      heures: 14,
      minutes: 35,
      secondes: 20,
    })
    expect(restant('2026-11-01T00:00:00Z', MAINTENANT).total).toBe(0)
  })
})
