import { graduations } from './echelle'

describe('graduations', () => {
  it('produit des pas ronds qui couvrent le maximum', () => {
    expect(graduations(1_160_000)).toEqual([0, 500_000, 1_000_000, 1_500_000])
    expect(graduations(89)).toEqual([0, 25, 50, 75, 100])
    expect(graduations(4)).toEqual([0, 1, 2, 3, 4])
  })

  it('gère un ensemble vide ou nul', () => {
    expect(graduations(0)).toEqual([0])
  })
})
