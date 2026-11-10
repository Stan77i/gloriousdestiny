import { formaterDateHeure } from './date'
import { formaterFcfa } from './montant'
import { normaliserTelephone } from './telephone'

const espaces = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ')

describe('formaterFcfa', () => {
  it('formate en entiers avec séparateur de milliers', () => {
    expect(espaces(formaterFcfa(12500))).toBe('12 500 FCFA')
    expect(formaterFcfa(0)).toBe('0 FCFA')
  })

  it('refuse un montant décimal', () => {
    expect(() => formaterFcfa(10.5)).toThrow(RangeError)
  })
})

describe('normaliserTelephone', () => {
  it('normalise un numéro camerounais', () => {
    expect(normaliserTelephone('6 90 00 00 01', '+237')).toBe('+237690000001')
    expect(normaliserTelephone('+237 690-000-001', '+237')).toBe('+237690000001')
    expect(normaliserTelephone('00237690000001', '+237')).toBe('+237690000001')
  })

  it('normalise un numéro ivoirien (10 chiffres)', () => {
    expect(normaliserTelephone('07 07 07 07 07', '+225')).toBe('+2250707070707')
  })

  it('refuse les numéros invalides ou d’un autre pays', () => {
    expect(normaliserTelephone('69000', '+237')).toBeNull()
    expect(normaliserTelephone('+225 0707070707', '+237')).toBeNull()
    expect(normaliserTelephone('abc', '+225')).toBeNull()
  })
})

describe('formaterDateHeure', () => {
  it("affiche l'heure du salon (UTC+1)", () => {
    expect(formaterDateHeure('2026-11-10T09:00:00Z')).toContain('10:00')
  })

  it("affiche l'heure d'Abidjan (UTC+0) si demandé", () => {
    expect(formaterDateHeure('2026-11-10T09:00:00Z', 'Africa/Abidjan')).toContain('09:00')
  })
})
