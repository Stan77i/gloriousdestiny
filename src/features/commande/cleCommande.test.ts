import { cleIdempotence, empreintePanier, oublierCleCommande } from './cleCommande'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('clé d’idempotence', () => {
  beforeEach(() => {
    oublierCleCommande()
  })

  it('ne dépend pas de l’ordre des lignes', () => {
    expect(
      empreintePanier([
        { varianteId: A, quantite: 1 },
        { varianteId: B, quantite: 2 },
      ]),
    ).toBe(
      empreintePanier([
        { varianteId: B, quantite: 2 },
        { varianteId: A, quantite: 1 },
      ]),
    )
  })

  it('reste la même pour un panier identique (double envoi)', () => {
    const panier = [{ varianteId: A, quantite: 2 }]
    expect(cleIdempotence(panier)).toBe(cleIdempotence(panier))
  })

  it('change quand le panier change', () => {
    const avant = cleIdempotence([{ varianteId: A, quantite: 2 }])
    expect(cleIdempotence([{ varianteId: A, quantite: 3 }])).not.toBe(avant)
  })
})
