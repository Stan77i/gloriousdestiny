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

describe('téléphones des pays desservis', () => {
  it('normalise chaque pays', async () => {
    const { normaliserTelephone, normaliserTelephoneLibre } = await import('./telephone')
    expect(normaliserTelephone('07700 900123', '+44')).toBe('+447700900123')
    expect(normaliserTelephone('+44 7700 900123', '+44')).toBe('+447700900123')
    expect(normaliserTelephone('514 555 0123', '+1')).toBe('+15145550123')
    expect(normaliserTelephone('1 514 555 0123', '+1')).toBe('+15145550123')
    expect(normaliserTelephone('06 12 34 56', '+241')).toBe('+24106123456')
    expect(normaliserTelephone('06 612 34 56', '+242')).toBe('+242066123456')
    expect(normaliserTelephone('77 123 45 67', '+221')).toBe('+221771234567')
    expect(normaliserTelephone('621 23 45 67', '+224')).toBe('+224621234567')
    expect(normaliserTelephone('77 123 45', '+221')).toBeNull()
    expect(normaliserTelephoneLibre('+221 77 123 45 67')).toBe('+221771234567')
    expect(normaliserTelephoneLibre('6 90 00 00 01')).toBe('+237690000001')
    expect(normaliserTelephoneLibre('+33 6 12 34 56 78')).toBeNull()
  })
})
