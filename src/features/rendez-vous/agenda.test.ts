import { fichierAgenda } from './agenda'

describe('fichierAgenda', () => {
  it('produit un événement en UTC avec rappel', () => {
    const ics = fichierAgenda({
      reference: 'RDV-2611-0001',
      debut: '2026-11-17T09:00:00.000Z',
      fin: '2026-11-17T11:00:00.000Z',
      prestation: 'Pose de perruque',
      lieu: 'Douala, Cameroun',
    })
    expect(ics).toContain('DTSTART:20261117T090000Z')
    expect(ics).toContain('DTEND:20261117T110000Z')
    expect(ics).toContain('UID:RDV-2611-0001@glorious-destiny')
    expect(ics).toContain('LOCATION:Douala\\, Cameroun')
    expect(ics).toContain('TRIGGER:-PT2H')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })
})
