import { describe, expect, it } from 'vitest'
import { bornesPeriode, graduation, variation } from './periodes'

describe('bornesPeriode', () => {
  it('calcule les périodes glissantes et calendaires', () => {
    expect(bornesPeriode('jour', '2026-11-11')).toMatchObject({
      du: '2026-11-11',
      au: '2026-11-11',
    })
    expect(bornesPeriode('7j', '2026-11-11')).toMatchObject({ du: '2026-11-05', au: '2026-11-11' })
    expect(bornesPeriode('30j', '2026-11-11')).toMatchObject({ du: '2026-10-13', au: '2026-11-11' })
    expect(bornesPeriode('mois', '2026-11-11')).toMatchObject({
      du: '2026-11-01',
      au: '2026-11-11',
    })
  })

  it('donne le mois précédent complet, y compris en janvier et après février', () => {
    expect(bornesPeriode('mois-1', '2026-11-11')).toMatchObject({
      du: '2026-10-01',
      au: '2026-10-31',
    })
    expect(bornesPeriode('mois-1', '2027-01-03')).toMatchObject({
      du: '2026-12-01',
      au: '2026-12-31',
    })
    expect(bornesPeriode('mois-1', '2028-03-15')).toMatchObject({
      du: '2028-02-01',
      au: '2028-02-29',
    })
  })
})

describe('variation', () => {
  it('arrondit et signe la variation', () => {
    expect(variation(35500, 9500)).toEqual({ valeur: '+274 %', sens: 'hausse' })
    expect(variation(8000, 10000)).toEqual({ valeur: '−20 %', sens: 'baisse' })
  })

  it('ne compare pas à zéro ni à une valeur identique', () => {
    expect(variation(5000, 0)).toBeNull()
    expect(variation(5000, 5000)).toBeNull()
    expect(variation(1001, 1000)).toBeNull()
  })
})

describe('graduation', () => {
  it('arrondit le haut de l’échelle à 1, 2 ou 5 × 10^n', () => {
    expect(graduation(0)).toBe(0)
    expect(graduation(9500)).toBe(10000)
    expect(graduation(15000)).toBe(20000)
    expect(graduation(35500)).toBe(50000)
    expect(graduation(100000)).toBe(100000)
  })
})
