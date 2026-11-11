import { describe, expect, it } from 'vitest'
import { schemaProduit, schemaService } from './catalogueAdmin.service'

describe('formulaire produit', () => {
  it('convertit les saisies en nombres et vide les champs facultatifs', () => {
    const r = schemaProduit.parse({
      prix: ' 12 500 ',
      publie: true,
      description: '  Colle pour dentelle.  ',
      seuilAlerte: '5',
      delaiAppro: '',
      stockSecurite: '7',
    })
    expect(r).toEqual({
      prix: 12500,
      publie: true,
      description: 'Colle pour dentelle.',
      seuilAlerte: 5,
      delaiAppro: null,
      stockSecurite: 7,
    })
  })

  it('refuse un prix vide, décimal ou négatif', () => {
    for (const prix of ['', '9500.5', '-1', 'abc']) {
      const r = schemaProduit.safeParse({
        prix,
        publie: true,
        description: '',
        seuilAlerte: '5',
        delaiAppro: '',
        stockSecurite: '',
      })
      expect(r.success).toBe(false)
    }
  })
})

describe('formulaire prestation', () => {
  it('borne la durée', () => {
    const base = { prix: '15000', tampon: '15', publie: true, description: '' }
    expect(schemaService.safeParse({ ...base, duree: '120' }).success).toBe(true)
    expect(schemaService.safeParse({ ...base, duree: '0' }).success).toBe(false)
    expect(schemaService.safeParse({ ...base, duree: '800' }).success).toBe(false)
  })
})
