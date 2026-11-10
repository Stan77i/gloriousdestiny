import { lireFiche } from './catalogue.service'

describe('lireFiche', () => {
  it('lit une fiche complète', () => {
    const f = lireFiche({
      accroche: 'La pose qui tient.',
      benefices: ['Séchage rapide'],
      utilisation: ['Nettoyez', 'Appliquez'],
      faq: [{ q: 'Question ?', r: 'Réponse.' }],
      associes: ['lace-melting-spray'],
    })
    expect(f.accroche).toBe('La pose qui tient.')
    expect(f.utilisation).toHaveLength(2)
    expect(f.faq[0]?.r).toBe('Réponse.')
  })

  it('donne une fiche vide pour une colonne vide ou absente', () => {
    for (const brute of [{}, null, undefined]) {
      const f = lireFiche(brute)
      expect(f.accroche).toBeUndefined()
      expect(f.benefices).toEqual([])
      expect(f.faq).toEqual([])
    }
  })

  it('ignore un champ mal formé sans perdre le reste', () => {
    const f = lireFiche({
      accroche: 'Ok',
      benefices: 'pas une liste',
      faq: [{ q: 'sans réponse' }],
    })
    expect(f.accroche).toBe('Ok')
    expect(f.benefices).toEqual([])
    expect(f.faq).toEqual([])
  })
})
