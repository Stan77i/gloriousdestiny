import { describe, expect, it } from 'vitest'
import { arc, projeter, type Grille } from './projection'

const G: Grille = {
  lon: [-170, 190],
  lat: [-56, 76],
  pas: 2,
  colonnes: 180,
  lignes: 66,
  points: [],
}

describe('projection de la carte', () => {
  it('place Douala et Abidjan sur la grille équirectangulaire', () => {
    expect(projeter(G, 9.7679, 4.0511)).toEqual({ x: (9.7679 + 170) / 2, y: (76 - 4.0511) / 2 })
    expect(projeter(G, -4.0083, 5.36)?.x).toBeCloseTo(82.996, 2)
  })

  it('reboucle les longitudes au-delà de 180°', () => {
    expect(projeter(G, -175, 0)?.x).toBeCloseTo(177.5, 5)
  })

  it('refuse un lieu hors du cadre', () => {
    expect(
      projeter({ ...G, lon: [7, 17], lat: [1, 13], colonnes: 50, lignes: 60 }, -4, 5),
    ).toBeNull()
  })

  it('bombe l’arc vers le haut', () => {
    const d = arc({ x: 0, y: 10 }, { x: 10, y: 10 })
    expect(d).toMatch(/^M0\.00,10\.00 Q5\.00,7\.20 10\.00,10\.00$/)
  })
})
