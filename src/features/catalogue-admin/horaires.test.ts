import { describe, expect, it } from 'vitest'
import { heureLisible, plageValide, resumerHoraires, type JourHoraire } from './horaires'

const j = (jourSemaine: number, debut = '09:00', fin = '18:00', ouvert = true): JourHoraire => ({
  jourSemaine,
  debut,
  fin,
  ouvert,
})

describe('resumerHoraires', () => {
  it('regroupe les jours consécutifs', () => {
    expect(resumerHoraires([1, 2, 3, 4, 5, 6].map((n) => j(n)))).toBe(
      'Du lundi au samedi, de 9 h à 18 h',
    )
  })

  it('sépare les jours aux horaires différents et les jours non consécutifs', () => {
    expect(
      resumerHoraires([
        j(1),
        j(2),
        j(3),
        j(4),
        j(5),
        j(6, '10:00', '16:30'),
        j(0, '09:00', '18:00', false),
      ]),
    ).toBe('Du lundi au vendredi, de 9 h à 18 h ; le samedi, de 10 h à 16 h 30')
    expect(resumerHoraires([j(2), j(4)])).toBe('Le mardi, de 9 h à 18 h ; le jeudi, de 9 h à 18 h')
    expect(resumerHoraires([j(6), j(0)])).toBe('Le samedi et le dimanche, de 9 h à 18 h')
  })

  it('indique un salon fermé', () => {
    expect(resumerHoraires([j(1, '09:00', '18:00', false)])).toBe('Salon fermé pour le moment')
  })
})

describe('plages', () => {
  it('formate et valide les heures', () => {
    expect(heureLisible('09:30')).toBe('9 h 30')
    expect(plageValide('09:00', '18:00')).toBe(true)
    expect(plageValide('18:00', '09:00')).toBe(false)
    expect(plageValide('9:00', '18:00')).toBe(false)
  })
})
